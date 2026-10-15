// ─────────────────────────────────────────────────────────────
// JUM Football · /api/live — quota-safe proxy for api-sports
// (API-FOOTBALL). Optimized for the 100 requests/day free plan.
//
// Adaptive cache: live fixtures → 120s TTL; quiet periods → 15min
// TTL. Fallback (today's Super Lig) cached separately by date,
// 30min TTL, max 2 fetches/hour. Daily quota guard at 80 upstream
// calls → emergency mode (60min TTLs, quotaGuarded flag). 15s
// in-flight lock: N parallel requests share ONE upstream call.
// On any upstream failure the last good cache is served (stale).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { serverEnv } from "./env";

/** Read per request — never baked into the static export. */
const apiKey = () => serverEnv("apiFootballKey");

const BASE = "https://v3.football.api-sports.io";
const SUPER_LIG_ID = 203;

const QUOTA_DAILY_LIMIT = 100;
const QUOTA_EMERGENCY_AT = 80;

const LIVE_TTL = 120_000; // 2 min while games are on
const IDLE_TTL = 15 * 60_000; // 15 min when quiet
const EMERGENCY_TTL = 60 * 60_000; // 60 min in quota emergency
const FALLBACK_TTL = 30 * 60_000; // 30 min, keyed by date
const FALLBACK_MAX_PER_HOUR = 2;
const INFLIGHT_LOCK_MS = 15_000;
const LEAGUE_SEARCH_TTL = 24 * 60 * 60_000; // 24h — league IDs never change mid-tournament

// AFCON confederation group: tournament + qualifiers + CAF club finals.
// League IDs are resolved at runtime via /leagues?search= (cached 24h),
// never hardcoded.
export const GROUPS: Record<string, { label: string; searches: string[]; keep: RegExp; drop?: RegExp }> = {
  afcon: {
    label: "AFCON",
    searches: ["Africa Cup of Nations", "caf champions", "caf confederation"],
    // search is fuzzy — keep African comps only (CONCACAF/AFC contain "CAF"/"AFC")
    keep: /africa|caf/i,
    drop: /concacaf|^afc| afc/i,
  },
};

// ── module-level state (persists across warm serverless calls) ──
type Cache = { data: unknown; at: number; ttl: number };
let liveCache: Cache | null = null;
let staleCache: { fixtures: unknown[]; at: number } | null = null;
const fallbackByDate = new Map<string, Cache>();
let fallbackLog: number[] = [];
let quota = { count: 0, day: "" };
let inFlight: Promise<Response> | null = null;
let inFlightAt = 0;
let groupInFlight: Promise<Response> | null = null;
let groupInFlightAt = 0;

// ── league-ID search cache (24h): query → resolved league ids ──
const leagueSearch = new Map<string, { ids: string; names: Record<number, string>; at: number }>();
// ── confederation group cache (adaptive TTL like the main route) ──
let groupCache: { group: string; live: unknown[]; next: unknown[]; leagueNames: Record<number, string>; at: number; ttl: number } | null = null;
let groupNextCache: { data: unknown[]; at: number } | null = null;
let groupNextLog: number[] = [];

const today = () => new Date().toISOString().slice(0, 10);
const dayOf = () => new Date().toDateString();

function logUpstream(endpoint: string) {
  // /lib/apiUsage.ts explains the math behind these logs
  // eslint-disable-next-line no-console
  console.log(`[api-usage] ${new Date().toISOString()} ${endpoint} call#${quota.count}/${QUOTA_DAILY_LIMIT}`);
}

function resetQuotaIfNewDay() {
  const d = dayOf();
  if (quota.day !== d) quota = { count: 0, day: d };
}

export function quotaGuarded() {
  resetQuotaIfNewDay();
  return quota.count >= QUOTA_EMERGENCY_AT;
}

function effectiveTtl(base: number): number {
  return quotaGuarded() ? EMERGENCY_TTL : base;
}

async function upstream(path: string): Promise<{ fixtures: unknown[] }> {
  const key = apiKey();
  if (!key) {
    // keyless deploy: fail closed — serve from cache / empty, no upstream calls
    throw new Error("upstream 503 CONFIG_MISSING");
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = (await res.json()) as { response?: unknown[] };
  return { fixtures: json.response ?? [] };
}

type LeagueRow = { league: { id: number; name: string } };

/** Resolve league IDs for a search term via /leagues?search=, cached 24h. */
async function resolveLeagueIds(
  query: string,
  keep?: RegExp,
  drop?: RegExp
): Promise<{ ids: string; names: Record<number, string> }> {
  const cached = leagueSearch.get(query);
  if (cached && Date.now() - cached.at < LEAGUE_SEARCH_TTL) return cached;
  logUpstream(`/leagues?search=${encodeURIComponent(query)}`);
  quota.count += 1;
  const key = apiKey();
  if (!key) return { ids: "", names: {} };
  const res = await fetch(`${BASE}/leagues?search=${encodeURIComponent(query)}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`leagues search ${res.status}`);
  const json = (await res.json()) as { response?: LeagueRow[] };
  const names: Record<number, string> = {};
  const ids: number[] = [];
  for (const row of json.response ?? []) {
    if (row?.league?.id && !ids.includes(row.league.id)) {
      if (keep && !keep.test(row.league.name)) continue; // drop fuzzy-match strays
      if (drop && drop.test(row.league.name)) continue;
      ids.push(row.league.id);
      names[row.league.id] = row.league.name;
    }
  }
  const joined = ids.join("-");
  leagueSearch.set(query, { ids: joined, names, at: Date.now() });
  return { ids: joined, names };
}

function groupPayload(at: number, stale: boolean) {
  return {
    group: groupCache!.group,
    live: groupCache!.live,
    next: groupCache!.next,
    leagueNames: groupCache!.leagueNames,
    lastUpdated: new Date(at).toISOString(),
    stale,
    quotaGuarded: quotaGuarded(),
    quota: { used: quota.count, limit: QUOTA_DAILY_LIMIT, emergencyAt: QUOTA_EMERGENCY_AT },
  };
}

/** Confederation group (e.g. AFCON): live fixtures across resolved leagues + next fixtures. */
export async function handleGroup(group: string): Promise<Response> {
  resetQuotaIfNewDay();
  const now = Date.now();
  const spec = GROUPS[group];

  // fresh cache → serve (TTL stretches in emergency)
  if (groupCache && groupCache.group === group && now - groupCache.at < effectiveTtl(groupCache.ttl)) {
    return NextResponse.json(groupPayload(groupCache.at, false));
  }
  if (groupInFlight && now - groupInFlightAt < INFLIGHT_LOCK_MS) {
    const res = await groupInFlight;
    return res.clone();
  }

  groupInFlightAt = now;
  groupInFlight = (async (): Promise<Response> => {
    try {
      // 1) resolve league IDs at runtime — 24h cached, one call per search term
      const idSets: string[] = [];
      const names: Record<number, string> = {};
      for (const q of spec.searches) {
        try {
          const r = await resolveLeagueIds(q, spec.keep, spec.drop);
          if (r.ids) idSets.push(r.ids);
          Object.assign(names, r.names);
        } catch {
          /* one bad search must not kill the group — others still resolve */
        }
      }
      const leagueIds = [...new Set(idSets.join("-").split("-").filter(Boolean))].join("-");

      if (!leagueIds) {
        groupCache = { group, live: [], next: [], leagueNames: names, at: Date.now(), ttl: IDLE_TTL };
        return NextResponse.json(groupPayload(Date.now(), false));
      }

      // 2) ONE live call across all resolved leagues
      //    (api-sports accepts hyphen-joined league IDs → same quota cost
      //    profile as the main /fixtures?live=all route)
      const guarded = quotaGuarded();
      logUpstream(`/fixtures?live=all&league=${leagueIds}`);
      quota.count += 1;
      const live = await upstream(`/fixtures?live=all&league=${leagueIds}`);

      // 3) upcoming fixtures for "Next: qualifiers" — the free plan has no
      //    `next` param, so look up +1..+3 days (rate-capped, 30min cache).
      let next: unknown[] = [];
      if (live.fixtures.length === 0) {
        const fresh =
          groupNextCache && now - groupNextCache.at < effectiveTtl(30 * 60_000);
        if (fresh) {
          next = groupNextCache!.data;
        } else {
          const hourAgo = Date.now() - 3_600_000;
          groupNextLog = groupNextLog.filter((t) => t > hourAgo);
          if (groupNextLog.length < 2) {
            const days: string[] = [];
            for (let i = 1; i <= 3; i++) {
              days.push(new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10));
            }
            try {
              const settled = await Promise.all(
                days.map((d) => {
                  logUpstream(`/fixtures?date=${d}&league=${leagueIds}`);
                  quota.count += 1;
                  return upstream(`/fixtures?date=${d}&league=${leagueIds}`).catch(
                    () => ({ fixtures: [] as unknown[] })
                  );
                })
              );
            next = settled.flatMap((r) => r.fixtures);
              groupNextCache = { data: next, at: Date.now() };
              groupNextLog.push(Date.now());
            } catch {
              /* next fixtures are decorative — live data still serves */
            }
          } else if (groupNextCache) {
            next = groupNextCache.data;
          }
        }
      }

      const ttl = guarded ? EMERGENCY_TTL : live.fixtures.length > 0 ? LIVE_TTL : IDLE_TTL;
      groupCache = { group, live: live.fixtures, next, leagueNames: names, at: Date.now(), ttl };
      return NextResponse.json(groupPayload(Date.now(), false));
    } catch {
      // upstream failure → last good group cache, stale
      if (groupCache && groupCache.group === group) {
        return NextResponse.json(groupPayload(groupCache.at, true));
      }
      return NextResponse.json({
        group,
        live: [],
        next: [],
        leagueNames: {},
        lastUpdated: new Date().toISOString(),
        stale: true,
        quotaGuarded: quotaGuarded(),
        quota: { used: quota.count, limit: QUOTA_DAILY_LIMIT, emergencyAt: QUOTA_EMERGENCY_AT },
      });
    } finally {
      setTimeout(() => {
        groupInFlight = null;
      }, 0);
    }
  })();

  const res = await groupInFlight;
  return res.clone();
}

function payload(
  fixtures: unknown[],
  source: "live" | "fallback",
  at: number,
  stale: boolean
) {
  return {
    fixtures,
    source,
    lastUpdated: new Date(at).toISOString(),
    stale,
    quotaGuarded: quotaGuarded(),
    quota: { used: quota.count, limit: QUOTA_DAILY_LIMIT, emergencyAt: QUOTA_EMERGENCY_AT },
  };
}

export async function handle(): Promise<Response> {
  resetQuotaIfNewDay();
  const now = Date.now();
  const guarded = quotaGuarded();

  // 1) fresh live cache → serve (TTLs stretch automatically in emergency)
  if (liveCache && now - liveCache.at < effectiveTtl(liveCache.ttl)) {
    const fixtures = liveCache.data as unknown[];
    if (fixtures.length > 0) {
      return NextResponse.json(payload(fixtures, "live", liveCache.at, false));
    }
    // empty live cache: idle path, check fallback freshness
    const date = today();
    const fb = fallbackByDate.get(date);
    if (fb && now - fb.at < effectiveTtl(fb.ttl)) {
      return NextResponse.json(payload(fb.data as unknown[], "fallback", fb.at, false));
    }
    if (now - liveCache.at < effectiveTtl(liveCache.ttl)) {
      return NextResponse.json(payload([], "live", liveCache.at, false));
    }
  }

  // 2) in-flight lock — parallel requests share one upstream call
  if (inFlight && now - inFlightAt < INFLIGHT_LOCK_MS) {
    const res = await inFlight;
    return res.clone();
  }

  inFlightAt = now;
  inFlight = (async (): Promise<Response> => {
    try {
      // ── primary: live fixtures ──
      logUpstream("/fixtures?live=all");
      quota.count += 1;
      const live = await upstream("/fixtures?live=all");
      const liveTtl = guarded ? EMERGENCY_TTL : live.fixtures.length > 0 ? LIVE_TTL : IDLE_TTL;
      liveCache = { data: live.fixtures, at: Date.now(), ttl: liveTtl };
      if (live.fixtures.length > 0) {
        staleCache = { fixtures: live.fixtures, at: Date.now() };
        return NextResponse.json(payload(live.fixtures, "live", Date.now(), false));
      }

      // ── live empty → fallback: today's Super Lig ──
      const date = today();
      const fresh =
        fallbackByDate.has(date) &&
        Date.now() - (fallbackByDate.get(date)!.at) < effectiveTtl(FALLBACK_TTL);
      if (fresh) {
        const fb = fallbackByDate.get(date)!;
        return NextResponse.json(payload(fb.data as unknown[], "fallback", fb.at, false));
      }
      const hourAgo = Date.now() - 3_600_000;
      fallbackLog = fallbackLog.filter((t) => t > hourAgo);
      if (fallbackLog.length < FALLBACK_MAX_PER_HOUR) {
        try {
          logUpstream(`/fixtures?date=${date}&league=${SUPER_LIG_ID}`);
          quota.count += 1;
          const fb = await upstream(`/fixtures?date=${date}&league=${SUPER_LIG_ID}`);
          fallbackLog.push(Date.now());
          fallbackByDate.set(date, { data: fb.fixtures, at: Date.now(), ttl: FALLBACK_TTL });
          return NextResponse.json(payload(fb.fixtures, "fallback", Date.now(), false));
        } catch {
          /* fall through to stale serve */
        }
      }
      // fallback quota exhausted → still serve empty live quietly
      return NextResponse.json(payload([], "live", Date.now(), false));
    } catch {
      // ── 429 / network / anything → last good cache, stale:true ──
      if (staleCache) {
        return NextResponse.json(payload(staleCache.fixtures, "live", staleCache.at, true));
      }
      if (liveCache) {
        return NextResponse.json(payload(liveCache.data as unknown[], "live", liveCache.at, true));
      }
      const fb = fallbackByDate.get(today());
      if (fb) {
        return NextResponse.json(payload(fb.data as unknown[], "fallback", fb.at, true));
      }
      return NextResponse.json(payload([], "live", Date.now(), true));
    } finally {
      setTimeout(() => {
        inFlight = null;
      }, 0);
    }
  })();

  const res = await inFlight;
  return res.clone();
}

// ── shared-cache hooks for sibling routes (e.g. /api/live-stats) ──
// Sibling route handlers import these so /api/live-stats NEVER runs a
// second upstream fixtures fetch — it reuses this module's liveCache,
// in-flight lock and quota counter. handle() serves from cache when
// fresh; the only upstream call it can trigger is the exact call
// /api/live itself would have made at that moment.
export async function liveSnapshot(): Promise<{
  fixtures: unknown[];
  stale: boolean;
  quotaGuarded: boolean;
}> {
  resetQuotaIfNewDay();
  const res = await handle();
  const json = (await res.json()) as { fixtures?: unknown[]; stale?: boolean };
  return { fixtures: json.fixtures ?? [], stale: !!json.stale, quotaGuarded: quotaGuarded() };
}

/** Count a /statistics (or any other) upstream call in the SAME daily counter. */
export function countStatsUpstream(endpoint: string) {
  resetQuotaIfNewDay();
  logUpstream(endpoint);
  quota.count += 1;
}
