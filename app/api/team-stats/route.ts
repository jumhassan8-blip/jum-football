// ─────────────────────────────────────────────────────────────
// JUM Football · /api/team-stats — season team averages.
// Serves data/teamsStats.json verbatim, cached 10 min in memory.
// ZERO upstream calls — pure static data.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import teamsData from "@/data/teamsStats.json";

const CACHE_TTL = 10 * 60_000; // 10 min
let cache: { data: unknown; at: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (!cache || now - cache.at > CACHE_TTL) {
    cache = { data: teamsData, at: now };
  }
  return NextResponse.json({
    teams: cache.data,
    lastUpdated: new Date(cache.at).toISOString(),
  });
}
