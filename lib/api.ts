// ─────────────────────────────────────────────────────────────
// JUM Football · API seam (v3)
// Components import ONLY from here. Swap internals for a real
// API later without touching any component.
// ─────────────────────────────────────────────────────────────

import {
  LATEST_NEWS,
  LEAGUE_BY_ID,
  LEAGUES,
  MATCHES,
  PLAYERS,
  STANDINGS,
  TEAMS,
  TOP_ROW,
  TRENDING_NEWS,
  CONFEDERATIONS,
  CHAT_SEED,
  POLL_SEED,
  RAFFLES,
  LIFESTYLE_POSTS,
  LIFESTYLE_GENERIC,
  FANS_SEED,
  type ChatMessage,
  type Raffle,
  type League,
  type Match,
  type MatchEvent,
  type NewsItem,
  type Player,
  type StandingRow,
  type Team,
} from "./jumMock";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export async function getLeagues(): Promise<League[]> {
  await delay();
  return LEAGUES;
}

export async function getConfederations(): Promise<string[]> {
  await delay(0);
  return CONFEDERATIONS;
}

export async function getTopRow() {
  await delay(0);
  return TOP_ROW;
}

export async function getMatches(): Promise<Match[]> {
  await delay();
  return MATCHES;
}

export async function getMatch(id: string): Promise<Match | undefined> {
  await delay();
  return MATCHES.find((m) => m.id === id);
}

export async function getMatchesByLeague(leagueId: string): Promise<Match[]> {
  await delay();
  return MATCHES.filter((m) => m.leagueId === leagueId);
}

export async function getStandings(leagueId: string): Promise<StandingRow[]> {
  await delay();
  return [...(STANDINGS[leagueId] ?? [])].sort((a, b) => b.pts - a.pts);
}

export async function getTopScorers(leagueId: string): Promise<Player[]> {
  await delay();
  const teamsIn = new Set(
    (STANDINGS[leagueId] ?? []).map((r) => r.teamId)
  );
  return PLAYERS.filter((p) => teamsIn.has(p.teamId))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);
}

export async function getTrendingNews(): Promise<NewsItem[]> {
  await delay();
  return TRENDING_NEWS;
}

export async function getLatestNews(): Promise<NewsItem[]> {
  await delay();
  return LATEST_NEWS;
}

export interface SearchResults {
  teams: Team[];
  leagues: League[];
  players: Player[];
}

export async function searchAll(query: string): Promise<SearchResults> {
  await delay(150);
  const q = query.trim().toLowerCase();
  if (!q) return { teams: [], leagues: [], players: [] };
  return {
    teams: TEAMS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q)
    ).slice(0, 8),
    leagues: LEAGUES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q) ||
        l.confederation.toLowerCase().includes(q)
    ).slice(0, 8),
    players: PLAYERS.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6),
  };
}

// ── sync lookups ─────────────────────────────────────────────

export function teamById(id: string): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}

export function leagueById(id: string): League | undefined {
  return LEAGUE_BY_ID[id];
}

export function playerById(id: string): Player | undefined {
  return PLAYERS.find((p) => p.id === id);
}

export function allMatchIds(): string[] {
  return MATCHES.map((m) => m.id);
}

export function allLeagueIds(): string[] {
  return LEAGUES.map((l) => l.id);
}

export function allPlayerIds(): string[] {
  return PLAYERS.map((p) => p.id);
}

export function chatFor(matchId: string): ChatMessage[] {
  return CHAT_SEED[matchId] ?? [];
}

export function pollFor(matchId: string) {
  return POLL_SEED[matchId] ?? { home: 34, draw: 28, away: 38 };
}

export function raffleFor(matchId: string): Raffle | undefined {
  return RAFFLES.find((r) => r.matchId === matchId);
}

export function lifestyleFor(playerId: string) {
  return LIFESTYLE_POSTS[playerId] ?? LIFESTYLE_GENERIC;
}

export function fansSeed() {
  return FANS_SEED;
}

/** Crest URL for a team — component must still handle onError fallback. */
export function crestUrl(team: Team): string {
  return team.crestId ? `https://crests.football-data.org/${team.crestId}.png` : "";
}

/** Win probability base + event shifts for the JUM Pulse panel. */
export function winProbability(match: Match, appliedEvents: MatchEvent[]) {
  let h = 0.34,
    d = 0.28,
    a = 0.38; // pre-match prior
  appliedEvents.forEach((e) => {
    h += e.probShift.h;
    d += e.probShift.d;
    a += e.probShift.a;
  });
  // time decay: draw probability shrinks as the clock runs
  const decay = Math.min(0.2, (match.minute ?? 0) / 90 * 0.22);
  d = Math.max(0.05, d - decay);
  const scale = 1 - d;
  h = h * scale;
  a = a * scale;
  const sum = h + d + a;
  return {
    h: Math.round((h / sum) * 100),
    d: Math.round((d / sum) * 100),
    a: Math.round((a / sum) * 100),
  };
}

/** Comeback Radar — signature JUM metric. */
export function comebackChance(match: Match, side: "home" | "away"): number {
  const diff = side === "home" ? match.awayScore - match.homeScore : match.homeScore - match.awayScore;
  if (diff <= 0) return 0; // only trailing side gets a comeback line
  const goalsNeeded = diff;
  const timeLeft = Math.max(0, 90 - (match.minute ?? 0));
  const momentumBoost = ((match.momentum ?? 0) * (side === "home" ? 1 : -1)) / 400;
  const base = (goalsNeeded === 1 ? 0.42 : 0.16) * (timeLeft / 60);
  return Math.max(2, Math.min(96, Math.round((base + momentumBoost) * 100)));
}

export const AFFILIATE_ENABLED = false;
