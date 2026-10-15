// ─────────────────────────────────────────────────────────────
// JUM Football · /api/live-stats — Attack Pressure table data.
//
// QUOTA-SAFE (non-negotiable):
//  · Fixture list comes from the SHARED /api/live cache layer
//    (module import) — ZERO extra upstream fixture fetches, ever.
//  · /statistics?fixture= is fetched ONLY for currently-live fixtures,
//    capped at 10, results cached 120s and SHARED across all users
//    (one upstream call per 120s per fixture, no matter how many
//    visitors the site has).
//  · Daily quota guard active → last cached snapshot served stale:true,
//    fail-closed. Every upstream stats call is counted in the SAME
//    daily counter as fixtures (countStatsUpstream).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { liveSnapshot, countStatsUpstream } from "@/lib/liveCore";
import { serverEnv } from "@/lib/env";

const BASE = "https://v3.football.api-sports.io";

const MAX_LIVE_STATS = 10;
const STATS_TTL = 120_000; // shared across all users

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

// fixtureId → { row, at } — shared 120s cache, module-level
const statsCache = new Map<number, { row: LiveStatsRow; at: number }>();
let lastGoodRows: LiveStatsRow[] = [];
let lastGoodAt = 0;

type LiveStatsRow = {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  minute: number | null;
  score: string;
  possessionHome: number; // 0–100
  shotsH: number;
  shotsA: number;
  cornersH: number;
  cornersA: number;
  fouls: number;
  dangerousAttacks: number; // combined, for the gauge
  dangerousAttacksH: number;
  dangerousAttacksA: number;
  refereeName: string | null;
  momentumPct: number; // home share 0–100 (existing momentum calc)
  status: string;
};

type StatsEntry = { type: string; value: string | number | null };
type ApiFixture = {
  fixture: { id: number; referee: string | null; status: { short: string; elapsed: number | null } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
  league: { name: string };
};

function num(entries: StatsEntry[] | undefined, type: string, home: boolean): number {
  const list = Array.isArray(entries) ? entries : [];
  const i = home ? 0 : 1;
  const v = list[i]?.value ?? list.find((e) => e.type === type)?.value;
  if (typeof v === "number") return v;
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Existing momentum calc — home attacking-momentum share from pressure stats. */
function momentumPctHome(daH: number, daA: number, shotsH: number, shotsA: number): number {
  const total = daH + daA;
  const daShare = total > 0 ? (daH / total) * 100 : 50;
  const shotShare = shotsH + shotsA > 0 ? (shotsH / (shotsH + shotsA)) * 100 : 50;
  return Math.max(5, Math.min(95, Math.round(daShare * 0.65 + shotShare * 0.35)));
}

async function fetchStatsRow(f: ApiFixture): Promise<LiveStatsRow> {
  const fixtureId = f.fixture.id;
  const cached = statsCache.get(fixtureId);
  const now = Date.now();
  if (cached && now - cached.at < STATS_TTL) return cached.row;

  let row: LiveStatsRow;
  const key = serverEnv("apiFootballKey");
  if (!key) {
    // keyless: pressure bars render from possession proxies (0) — fail closed
    row = baseRow(f, []);
  } else {
    countStatsUpstream(`/statistics?fixture=${fixtureId}`);
    const res = await fetch(`${BASE}/statistics?fixture=${fixtureId}`, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const prev = statsCache.get(fixtureId);
      if (prev) return prev.row; // last good, stale by definition
      row = baseRow(f, []);
    } else {
      const json = (await res.json()) as { response?: { statistics?: StatsEntry[] }[] };
      row = baseRow(f, json.response?.[0]?.statistics ?? []);
    }
  }
  statsCache.set(fixtureId, { row, at: now });
  return row;
}

function baseRow(f: ApiFixture, entries: StatsEntry[]): LiveStatsRow {
  const daH = num(entries, "Dangerous Attacks", true);
  const daA = num(entries, "Dangerous Attacks", false);
  const shotsH = num(entries, "Total Shots", true);
  const shotsA = num(entries, "Total Shots", false);
  return {
    fixtureId: f.fixture.id,
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
    minute: f.fixture.status.elapsed ?? null,
    score: `${f.goals.home ?? 0}-${f.goals.away ?? 0}`,
    possessionHome: num(entries, "Ball Possession", true),
    shotsH,
    shotsA,
    cornersH: num(entries, "Corner Kicks", true),
    cornersA: num(entries, "Corner Kicks", false),
    fouls: num(entries, "Fouls", true) + num(entries, "Fouls", false),
    dangerousAttacks: daH + daA,
    dangerousAttacksH: daH,
    dangerousAttacksA: daA,
    refereeName: f.fixture.referee ?? null,
    momentumPct: momentumPctHome(daH, daA, shotsH, shotsA),
    status: f.fixture.status.short,
  };
}

export async function GET() {
  // static-export prerender: never touch the network at build time
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return NextResponse.json({ rows: [], stale: false, lastUpdated: new Date().toISOString() });
  }
  try {
    const { fixtures, stale, quotaGuarded } = await liveSnapshot();
    const now = Date.now();
    const live = (fixtures as ApiFixture[]).filter((f) =>
      LIVE_STATUSES.has(f?.fixture?.status?.short ?? "")
    );
    const capped = live.slice(0, MAX_LIVE_STATS);

    // quota guard → serve last cached snapshot, fail-closed
    if (quotaGuarded && lastGoodRows.length > 0) {
      return NextResponse.json({
        rows: lastGoodRows,
        stale: true,
        quotaGuarded: true,
        lastUpdated: new Date(lastGoodAt).toISOString(),
      });
    }

    const rows: LiveStatsRow[] = [];
    for (const f of capped) {
      try {
        rows.push(await fetchStatsRow(f));
      } catch {
        /* one bad fixture must not sink the table */
      }
    }
    if (rows.length > 0) {
      lastGoodRows = rows;
      lastGoodAt = now;
    }
    return NextResponse.json({
      rows,
      stale,
      quotaGuarded,
      lastUpdated: new Date(now).toISOString(),
    });
  } catch {
    // absolute last resort — never an error page
    return NextResponse.json({
      rows: lastGoodRows,
      stale: true,
      lastUpdated: new Date(lastGoodAt).toISOString(),
    });
  }
}
