// ─────────────────────────────────────────────────────────────
// JUM Football · Fan Intelligence data layer
// (referees.json / teamsStats.json — SEED DATA, see DATA ETHICS below)
//
// DATA ETHICS: referees are real people. Every number in these files
// is a seeded fan-vote illustration, NOT an official officiating
// statistic. UI must carry the "Fan-rated" label + the disclaimer
// line wherever referee numbers appear. Never present as fact.
// ─────────────────────────────────────────────────────────────

import refereesData from "@/data/referees.json";
import teamsData from "@/data/teamsStats.json";

export type RefTrend = "up" | "down" | "flat";

export interface Referee {
  id: string;
  name: string;
  league: string; // "Premier League" | "Super Lig"
  avgYellow: number;
  avgRed: number;
  avgFouls: number;
  fairnessScore: number; // 0–10 (seeded)
  homeWinPct: number; // 0–100
  fanRating: number; // 0–10
  cardsLast10: number[]; // exactly 10 games
  style: string; // one-line personality
  trend: RefTrend;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  logo: string; // "" → TeamLogo initials fallback
  avgCornersFor: number;
  avgPossession: number;
  avgShots: number;
  avgGoals: number;
  fairPlayRank: number;
  league?: string;
}

export const REFEREES = refereesData as unknown as Referee[];
export const TEAMS_STATS = teamsData as unknown as TeamStats[];

// ── lookups ──────────────────────────────────────────────────

export function getRefById(id: string): Referee | undefined {
  return REFEREES.find((r) => r.id === id);
}

/** Fuzzy match on a live fixture's referee string ("A. Taylor" ↔ "Anthony Taylor"). */
export function findRefByName(name: string | null | undefined): Referee | undefined {
  if (!name) return undefined;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const target = norm(name);
  if (!target) return undefined;
  const last = target.split(" ").pop() ?? "";
  return REFEREES.find((r) => {
    const rn = norm(r.name);
    const parts = rn.split(" ");
    const rLast = parts.pop() ?? "";
    // exact surname match + same first initial ("a" vs "anthony")
    return (
      rLast === last &&
      (parts[0]?.startsWith(target.split(" ")[0] ?? "") || target.startsWith(parts[0]?.[0] ?? ""))
    );
  });
}

export function teamById(teamId: string): TeamStats | undefined {
  return TEAMS_STATS.find((t) => t.teamId === teamId);
}

export function findTeamByName(name: string | null | undefined): TeamStats | undefined {
  if (!name) return undefined;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const target = norm(name);
  return TEAMS_STATS.find((t) => norm(t.teamName) === target);
}

// ── derived helpers ──────────────────────────────────────────

export type FairnessBand = "favorite" | "balanced" | "strict";

export function fairnessBand(score: number): FairnessBand {
  if (score >= 8) return "favorite";
  if (score >= 6.5) return "balanced";
  return "strict";
}

/** League-average context lines for the detail stat cards. */
export function leagueAverages(league: string): { avgYellow: number; avgFouls: number } {
  const pool = REFEREES.filter((r) => r.league === league);
  const n = Math.max(1, pool.length);
  const round1 = (x: number) => Math.round(x * 10) / 10;
  return {
    avgYellow: round1(pool.reduce((s, r) => s + r.avgYellow, 0) / n),
    avgFouls: round1(pool.reduce((s, r) => s + r.avgFouls, 0) / n),
  };
}

/**
 * One-line insight from fairness bands (i18n key, resolved by callers
 * with t() so every locale stays covered):
 *  ≥7.5  → "lets the game flow" attacking-sides line
 *  <6.5  → "card-heavy — expect stoppages"
 *  else  → balanced line
 */
export function insightFor(ref: Referee): "fanintel.insight.flow" | "fanintel.insight.strict" | "fanintel.insight.balanced" {
  if (ref.fairnessScore >= 7.5) return "fanintel.insight.flow";
  if (ref.fairnessScore < 6.5) return "fanintel.insight.strict";
  return "fanintel.insight.balanced";
}

/** "AT" — two-letter initials for the ref avatar circle. */
export function refInitials(name: string): string {
  const parts = name.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ\s-]/g, "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "";
  return (first + last).toUpperCase();
}
