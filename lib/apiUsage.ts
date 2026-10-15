// ─────────────────────────────────────────────────────────────
// JUM Football · API quota notes (see README "API quota")
//
// /api/live logs one line per upstream call:
//   [api-usage] 2026-10-13T12:00:00.000Z /fixtures?live=all call#3/100
//
// Estimated daily upstream calls (QUOTA_DAILY_LIMIT=100,
// QUOTA_EMERGENCY_AT=80):
//
//   Idle day (no live matches): primary /fixtures?live=all cached
//   15min → 96/day worst case. Fallback (today's Super Lig) cached
//   by date 30min, max 2 fetches/hour → rarely fires. Total ≈ 96,
//   usually far fewer because quiet caches keep getting hit.
//
//   Heavy matchday: live cache shrinks to 120s → 30/hour → ~720/day
//   theoretical worst case, so the quota guard engages at 80 and
//   stretches every TTL to 60min, capping real usage at ~100/day.
//
//   Emergency mode serves cached/stale data with quotaGuarded:true
//   so the UI can tell users live updates are paused.
// ─────────────────────────────────────────────────────────────
export const API_USAGE_NOTES = true;
