"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDemoMode, getFirestoreDb } from "./firebase";
import { TEAMS } from "./jumMock";

// ── Followed teams ────────────────────────────────────────────
// Real mode: Firestore users/{uid}/follows/{teamName} + users/{uid}
// mirror array (server queries fans per team). Canonical key is the
// team NAME — that's what live API fixtures carry, so the goal
// detector can match fans. Demo mode keeps the localStorage echo.
// One-time migration lifts local follows (possibly legacy short ids)
// up into Firestore as canonical names.

const LS_KEY = "jum-follows";
const MIGRATED_KEY = "jum-follows-migrated";

/** Accepts a team id ("gs") or name ("Galatasaray") — always returns a name. */
export function canonicalTeamName(idOrName: string): string {
  return TEAMS.find((t) => t.id === idOrName)?.name ?? idOrName;
}

function lsRead(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function lsWrite(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("jum-store-change"));
}

export function useFollowedTeams() {
  const [ids, setIds] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const migrated = useRef(false);

  useEffect(() => {
    let detach: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      if (isDemoMode()) {
        const sync = () => { if (!cancelled) setIds(lsRead()); };
        sync();
        window.addEventListener("jum-store-change", sync);
        detach = () => window.removeEventListener("jum-store-change", sync);
        return;
      }
      const { watchAuth } = await import("./firebase");
      const offAuth = watchAuth((u) => { if (!cancelled) setUid(u?.uid ?? null); });
      detach = offAuth;
    })();

    return () => { cancelled = true; detach?.(); };
  }, []);

  // subscribe to Firestore follows once we have a uid
  useEffect(() => {
    if (!uid || isDemoMode()) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const db = await getFirestoreDb();
      if (!db || cancelled) return;
      const { collection, onSnapshot } = await import("firebase/firestore");
      unsub = onSnapshot(collection(db, "users", uid, "follows"), (snap) => {
        if (cancelled) return;
        const names: string[] = [];
        snap.forEach((d) => names.push(d.id));
        setIds(names);
        // one-time migration: lift localStorage follows (legacy ids
        // normalized to canonical names) into Firestore
        if (!migrated.current && !window.localStorage.getItem(MIGRATED_KEY)) {
          migrated.current = true;
          window.localStorage.setItem(MIGRATED_KEY, "1");
          const local = lsRead().map(canonicalTeamName);
          for (const name of local) {
            if (!names.includes(name)) void writeFollow(uid, name, true);
          }
        }
      });
    })();
    return () => { cancelled = true; unsub?.(); };
  }, [uid]);

  const toggle = useCallback((team: string) => {
    const name = canonicalTeamName(team);
    if (!uid || isDemoMode()) {
      const cur = lsRead();
      lsWrite(cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]);
      return;
    }
    void writeFollow(uid, name, !ids.includes(name));
  }, [uid, ids]);

  const addMany = useCallback((teams: string[]) => {
    const unique = [...new Set(teams.map(canonicalTeamName))];
    if (!uid || isDemoMode()) {
      lsWrite([...new Set([...lsRead(), ...unique])]);
      return;
    }
    for (const name of unique) {
      if (!ids.includes(name)) void writeFollow(uid, name, true);
    }
  }, [uid, ids]);

  return { ids, toggle, addMany, uid };
}

async function writeFollow(uid: string, team: string, follow: boolean) {
  try {
    const db = await getFirestoreDb();
    if (!db) return;
    const { doc, setDoc, deleteDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } =
      await import("firebase/firestore");
    const ref = doc(db, "users", uid, "follows", team);
    if (follow) {
      await setDoc(ref, { name: team, followedAt: serverTimestamp() });
      await updateDoc(doc(db, "users", uid), { follows: arrayUnion(team) }).catch(() =>
        setDoc(doc(db, "users", uid), { follows: [team] }, { merge: true })
      );
    } else {
      await deleteDoc(ref);
      await updateDoc(doc(db, "users", uid), { follows: arrayRemove(team) }).catch(() => {});
    }
  } catch {
    /* offline — Firestore retry is handled on next open */
  }
}

// ── Notification preferences ──────────────────────────────────
// Global: users/{uid}/settings/notifications. Per-team override:
// users/{uid}/teamNotif/{teamName} (absent = inherit global).

export type NotifPrefs = {
  goals: boolean;           // default true — "Goals only" plan
  allScoreChanges: boolean; // also non-goal score changes (rare)
  kickoff: boolean;
  fulltime: boolean;
  news: boolean;            // top-news digest, ≤1/hour
};

export const DEFAULT_PREFS: NotifPrefs = {
  goals: true,
  allScoreChanges: false,
  kickoff: false,
  fulltime: false,
  news: false,
};

const PREFS_LS = "jum-notif-prefs";

function readLsPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(window.localStorage.getItem(PREFS_LS) ?? "{}") as Partial<NotifPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Global prefs — live-subscribed in real mode, localStorage in demo. */
export function useNotifPrefs(uid: string | null) {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (!uid || isDemoMode()) {
      const sync = () => setPrefs(readLsPrefs());
      sync();
      window.addEventListener("jum-store-change", sync);
      return () => window.removeEventListener("jum-store-change", sync);
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const db = await getFirestoreDb();
      if (!db || cancelled) return;
      const { doc, onSnapshot } = await import("firebase/firestore");
      unsub = onSnapshot(doc(db, "users", uid, "settings", "notifications"), (snap) => {
        if (cancelled) return;
        setPrefs({ ...DEFAULT_PREFS, ...((snap.data() ?? {}) as Partial<NotifPrefs>) });
      });
    })();
    return () => { cancelled = true; unsub?.(); };
  }, [uid]);

  const update = useCallback(async (patch: Partial<NotifPrefs>) => {
    setPrefs((p) => ({ ...p, ...patch })); // optimistic
    if (!uid || isDemoMode()) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PREFS_LS, JSON.stringify({ ...readLsPrefs(), ...patch }));
        window.dispatchEvent(new Event("jum-store-change"));
      }
      return;
    }
    try {
      const db = await getFirestoreDb();
      if (!db) return;
      const { doc, setDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      // mirror opt-in flags on the user doc so server fan-out queries stay cheap
      const mirror: Record<string, unknown> = { ...patch };
      if (patch.news !== undefined) mirror.news = patch.news;
      if (patch.kickoff !== undefined) mirror.kickoff = patch.kickoff;
      if (patch.fulltime !== undefined) mirror.fulltime = patch.fulltime;
      if (patch.allScoreChanges !== undefined) mirror.allScoreChanges = patch.allScoreChanges;
      await setDoc(
        doc(db, "users", uid, "settings", "notifications"),
        { ...patch, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await updateDoc(doc(db, "users", uid), mirror).catch(async () => {
        const { setDoc: sd } = await import("firebase/firestore");
        await sd(doc(db, "users", uid), mirror, { merge: true });
      });
    } catch {
      /* offline — prefs sync on reconnect */
    }
  }, [uid]);

  return { prefs, update };
}

/** Per-team override — null = inherit global. */
export function useTeamNotifOverride(uid: string | null, team: string | null) {
  const [override, setOverride] = useState<NotifPrefs | null>(null);

  useEffect(() => {
    if (!team) return;
    if (!uid || isDemoMode()) {
      setOverride(null);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const db = await getFirestoreDb();
      if (!db || cancelled) return;
      const { doc, onSnapshot } = await import("firebase/firestore");
      unsub = onSnapshot(doc(db, "users", uid, "teamNotif", team), (snap) => {
        if (cancelled) return;
        setOverride(snap.exists() ? ({ ...DEFAULT_PREFS, ...(snap.data() as Partial<NotifPrefs>) }) : null);
      });
    })();
    return () => { cancelled = true; unsub?.(); };
  }, [uid, team]);

  const save = useCallback(async (next: NotifPrefs | null) => {
    setOverride(next); // optimistic
    if (!uid || !team || isDemoMode()) return;
    try {
      const db = await getFirestoreDb();
      if (!db) return;
      const { doc, setDoc, deleteDoc, serverTimestamp } = await import("firebase/firestore");
      if (next === null) await deleteDoc(doc(db, "users", uid, "teamNotif", team));
      else await setDoc(doc(db, "users", uid, "teamNotif", team), { ...next, updatedAt: serverTimestamp() });
    } catch {
      /* offline */
    }
  }, [uid, team]);

  return { override, save };
}
