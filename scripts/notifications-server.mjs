// ─────────────────────────────────────────────────────────────
// JUM Football · server-side notification triggers (zero new infra).
// Runs inside the existing dev-server process:
//
//  · Goal detector — polls the CACHED /api/live board every 60s
//    (zero extra api-football calls), diffs goals + status per
//    fixture, fans out FCM to followers of both teams.
//  · News digest — /api/news calls maybeNotifyNews() after each
//    cache refresh; capped at 1 notification/hour, deduped by link.
//
// Requires (see FIREBASE_SETUP.md):
//  · FIREBASE_SERVICE_ACCOUNT — service-account JSON (string), or
//    GOOGLE_APPLICATION_CREDENTIALS. Enables Firestore reads AND the
//    FCM v1 send path (firebase-admin/messaging) — no Server key needed.
//  · FCM_SERVER_KEY (optional) — legacy Server key. When present, sends
//    go through the legacy REST endpoint instead of v1.
// Without credentials everything fails closed with a single startup log line.
// FCM free tier: fine at any realistic scale; every send is logged.
// ─────────────────────────────────────────────────────────────

import { createRequire } from "node:module";

let adminApp = null;
let db = null;
let firestoreReady = false;

const serverKey = process.env.FCM_SERVER_KEY ?? "";

// .mjs runs as ESM — firebase-admin ships CJS, load it lazily via createRequire
let adminModules = null;
function loadAdmin() {
  if (adminModules) return adminModules;
  const req = createRequire(import.meta.url);
  adminModules = {
    app: req("firebase-admin/app"),
    firestore: req("firebase-admin/firestore"),
    messaging: req("firebase-admin/messaging"),
  };
  return adminModules;
}

function initAdmin() {
  if (adminApp || firestoreReady) return;
  try {
    const { cert, applicationDefault, getApps, initializeApp } = loadAdmin().app;
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saJson) {
      adminApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(saJson)) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = getApps().length ? getApps()[0] : initializeApp({ credential: applicationDefault() });
    } else {
      return; // fail closed, logged by caller
    }
    db = loadAdmin().firestore.getFirestore(adminApp);
    firestoreReady = true;
  } catch (e) {
    adminApp = null;
    db = null;
    firestoreReady = false;
    console.warn(`[notify] firebase-admin init failed: ${String(e).slice(0, 140)}`);
  }
}

// Push triggers are live whenever Firestore is reachable — the service
// account doubles as the FCM v1 credential, so a legacy Server key is
// optional (it only switches the transport).
function ready() {
  return firestoreReady;
}

function transport() {
  return serverKey ? "legacy" : "v1";
}

export function triggersStatus() {
  initAdmin();
  return {
    firestore: firestoreReady,
    fcm: ready(),
    transport: transport(),
    active: ready(),
  };
}

// ── FCM legacy send (batched ≤500/batch, prune dead tokens) ──

const PRUNE_ERRORS = new Set([
  "NotRegistered",
  "InvalidRegistration",
  "MismatchSenderId",
  "Registration token expired",
]);

/**
 * @param {Array<{uid:string, ref:object, token:string}>} entries
 * @param {{title:string, body:string, url:string}} payload
 */
async function sendFcm(entries, payload) {
  let sent = 0;
  let pruned = 0;
  for (let i = 0; i < entries.length; i += 500) {
    const batch = entries.slice(i, i + 500);
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${serverKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_ids: batch.map((e) => e.token),
          priority: "high",
          notification: { title: payload.title, body: payload.body, icon: "/favicon.ico" },
          data: { url: payload.url },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json().catch(() => null);
      if (json?.results) {
        json.results.forEach((r, idx) => {
          if (r.error && PRUNE_ERRORS.has(r.error)) {
            pruned++;
            batch[idx].ref.delete().catch(() => {});
          }
        });
        sent += json.success ?? batch.length;
      } else {
        sent += batch.length;
      }
    } catch (e) {
      console.warn(`[notify] FCM batch failed: ${String(e).slice(0, 100)}`);
    }
  }
  return { sent, pruned };
}

// ── FCM v1 send via firebase-admin (no Server key needed) ────

const V1_PRUNE = /not-registered|invalid-argument|sender-id-mismatch|expired|registration-token-not-registered/i;

/** Same contract as sendFcm, but through the v1 API using the service account. */
async function sendFcmV1(entries, payload) {
  const messaging = loadAdmin().messaging.getMessaging(adminApp);
  let sent = 0;
  let pruned = 0;
  for (let i = 0; i < entries.length; i += 500) {
    const batch = entries.slice(i, i + 500);
    const messages = batch.map((e) => ({
      token: e.token,
      notification: { title: payload.title, body: payload.body },
      data: { url: payload.url, kind: payload.kind || "" },
      webpush: {
        notification: { icon: "/favicon.ico" },
        fcmOptions: { link: payload.url },
      },
    }));
    try {
      const resp = await messaging.sendEach(messages);
      resp.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = String(r.error?.code || r.error?.message || "");
          if (V1_PRUNE.test(code)) {
            pruned++;
            batch[idx].ref.delete().catch(() => {});
          } else {
            console.warn(`[notify] v1 send failed: ${code.slice(0, 80)}`);
          }
        } else {
          sent++;
        }
      });
    } catch (e) {
      console.warn(`[notify] FCM v1 batch failed: ${String(e).slice(0, 100)}`);
    }
  }
  return { sent, pruned };
}

/** All FCM tokens for a set of uids (collectionGroup read, one query). */
async function tokensForUids(uids) {
  if (uids.size === 0) return [];
  const snap = await db.collectionGroup("tokens").get();
  const out = [];
  snap.forEach((d) => {
    const uid = d.ref.parent.parent?.id;
    if (uid && uids.has(uid)) out.push({ uid, ref: d.ref, token: d.id });
  });
  return out;
}

// ── Fan-out helpers ──────────────────────────────────────────

/** Followers of any of the given team names, filtered by an opt-in flag. */
async function followersOf(teams, prefField) {
  const uids = new Set();
  const matchesPref = (d) => {
    const v = d.get(prefField);
    return prefField === "goals" ? v !== false : v === true; // goals default ON
  };
  if (teams.length === 0) {
    // no team filter → all users opted into the flag (used by news digest)
    const snap = await db.collection("users").where(prefField, "==", true).get();
    snap.forEach((d) => uids.add(d.id));
    return uids;
  }
  for (const team of teams) {
    const snap = await db.collection("users").where("follows", "array-contains", team).get();
    snap.forEach((d) => {
      if (matchesPref(d)) uids.add(d.id);
    });
  }
  return uids;
}

async function fanOut(teams, prefField, payload) {
  const uids = await followersOf(teams, prefField);
  const tokens = await tokensForUids(uids);
  const { sent, pruned } = serverKey
    ? await sendFcm(tokens, payload)
    : await sendFcmV1(tokens, payload);
  console.log(
    `[notify] ${payload.kind} → teams=${teams.join(" vs ")} followers=${uids.size} tokens=${tokens.length} sent=${sent} pruned=${pruned}`
  );
  return { followers: uids.size, sent, pruned };
}

// ── Goal detector ────────────────────────────────────────────

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
let baseline = null; // Map fixtureId → { h, a, short }
let detectorTimer = null;

/** Matches the client deep-link: /live cards open /match/1{last5}. */
function matchUrl(fixtureId) {
  return `/match/1${String(fixtureId).slice(-5)}/`;
}

async function detectorTick(port) {
  let json;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/live`, { cache: "no-store" });
    if (!res.ok) return;
    json = await res.json();
  } catch {
    return; // server mid-restart — next tick retries
  }
  const fixtures = Array.isArray(json?.fixtures) ? json.fixtures : [];
  const snap = new Map();
  for (const f of fixtures) {
    snap.set(f.fixture.id, {
      h: f.goals.home ?? 0,
      a: f.goals.away ?? 0,
      short: f.fixture.status.short,
    });
  }
  if (!baseline) {
    baseline = snap; // first tick seeds the baseline — no burst on restart
    return;
  }
  for (const f of fixtures) {
    const prev = baseline.get(f.fixture.id);
    if (!prev) continue;
    const now = snap.get(f.fixture.id);
    const home = f.teams.home.name;
    const away = f.teams.away.name;
    const score = `${now.h} - ${now.a}`;
    const minute = f.fixture.status.elapsed ?? "";

    // goal: any side's tally went up
    if (now.h > prev.h || now.a > prev.a) {
      const scorer = now.h > prev.h ? home : away;
      fanOut([home, away], "goals", {
        kind: "goal",
        title: `⚽ GOAL! ${scorer} ${now.h}-${now.a}${minute ? ` (${minute}')` : ""}`,
        body: `${home} ${score} ${away} · ${f.league.name}`,
        url: matchUrl(f.fixture.id),
      }).catch((e) => console.warn(`[notify] goal fan-out failed: ${String(e).slice(0, 100)}`));
    }

    // kick-off: fixture transitioned from not-started to live
    const wasLive = LIVE_STATUSES.has(prev.short);
    const isLive = LIVE_STATUSES.has(now.short);
    if (!wasLive && isLive) {
      fanOut([home, away], "kickoff", {
        kind: "kickoff",
        title: `🟢 KICK-OFF: ${home} vs ${away}`,
        body: f.league.name,
        url: matchUrl(f.fixture.id),
      }).catch((e) => console.warn(`[notify] kickoff fan-out failed: ${String(e).slice(0, 100)}`));
    }

    // full-time
    if (now.short === "FT" && prev.short !== "FT") {
      fanOut([home, away], "fulltime", {
        kind: "fulltime",
        title: `🏁 FULL-TIME: ${home} ${now.h}-${now.a} ${away}`,
        body: f.league.name,
        url: matchUrl(f.fixture.id),
      }).catch((e) => console.warn(`[notify] fulltime fan-out failed: ${String(e).slice(0, 100)}`));
    }
  }
  baseline = snap;
}

export function startTriggers({ port, intervalMs = 60_000 } = {}) {
  initAdmin();
  if (firestoreReady) {
    // presence sweeper — Firestore has no onDisconnect (RTDB primitive),
    // so heartbeat docs older than 150s are reaped here and the
    // aggregate counter is recomputed. Survives crashes/tabs closed.
    const sweeper = setInterval(() => {
      presenceSweep().catch(() => {});
    }, 120_000);
    sweeper.unref?.();
    console.log("[notify] presence sweeper live — reaps stale watchers every 120s");
  }
  if (!ready()) {
    console.log("[notify] push triggers disabled (service account missing) — see FIREBASE_SETUP.md");
    return;
  }
  if (detectorTimer) clearInterval(detectorTimer);
  detectorTimer = setInterval(() => {
    detectorTick(port).catch(() => {});
  }, intervalMs);
  detectorTimer.unref?.();
  console.log(`[notify] goal detector live — polls cached /api/live every ${intervalMs / 1000}s (0 extra API calls) [fcm=${transport()}]`);
}

// ── Presence sweeper (server-side cleanup) ───────────────────

const PRESENCE_STALE_MS = 150_000;

async function presenceSweep() {
  if (!firestoreReady) return;
  try {
    const matches = await db.collection("matchWatchers").get();
    for (const matchDoc of matches.docs) {
      const online = await matchDoc.ref.collection("online").limit(500).get();
      if (online.empty) continue;
      const now = Date.now();
      const fresh = [];
      const stale = [];
      online.forEach((d) => {
        const ls = d.get("lastSeen");
        const ts = ls?.toMillis ? ls.toMillis() : ls ? new Date(ls).getTime() : 0;
        (now - ts <= PRESENCE_STALE_MS ? fresh : stale).push(d);
      });
      if (stale.length > 0) {
        const batch = db.batch();
        for (const d of stale) batch.delete(d.ref);
        await batch.commit();
      }
      const cur = matchDoc.get("count") ?? 0;
      if (cur !== fresh.length) {
        await matchDoc.ref.set(
          { count: fresh.length, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    }
  } catch {
    /* sweeper never takes the server down */
  }
}

// ── News digest (≤1/hour, deduped by link) ───────────────────

let lastNewsAt = 0;
let lastNewsLink = "";

/**
 * Called by /api/news after each successful cache refresh.
 * @param {Array<{title:string, source:string, link:string}>} items
 */
export async function maybeNotifyNews(items) {
  try {
    initAdmin();
    if (!ready() || !Array.isArray(items) || items.length === 0) return;
    const newest = items[0];
    if (!newest?.link || newest.link === lastNewsLink) return;
    if (Date.now() - lastNewsAt < 3_600_000) return; // 1/hour cap — never spam
    lastNewsAt = Date.now();
    lastNewsLink = newest.link;
    const uids = await followersOf([], "news"); // empty teams → all news opt-ins
    if (uids.size === 0) return;
    const tokens = await tokensForUids(uids);
    const { sent, pruned } = await sendFcm(tokens, {
      kind: "news",
      title: `📰 ${newest.source}`,
      body: newest.title.slice(0, 120),
      url: newest.link,
    });
    console.log(`[notify] news digest → opt-ins=${uids.size} tokens=${tokens.length} sent=${sent} pruned=${pruned}`);
  } catch (e) {
    console.warn(`[notify] news digest failed: ${String(e).slice(0, 100)}`);
  }
}
