// ─────────────────────────────────────────────────────────────
// JUM Football · logo resolution seam
//
// API-READY: when real data arrives (10,000 clubs), logos and names
// resolve automatically through this helper — no manual registry
// edits needed. TeamLogo is the only component that renders a logo.
//
//   P1  team.logo / team.logoUrl  (API-provided)
//   P2  numeric id / crestId      (football-data.org crest CDN)
//   P3  known name → crest map    (wrong IDs are safe: TeamLogo's
//       onError catches the 404 and falls through to initials)
//   P4  "" → TeamLogo renders a local initials circle
// ─────────────────────────────────────────────────────────────

/** Accepts a club name string or any team-shaped object from any API. */
export type TeamLike =
  | string
  | {
      name?: string;
      logo?: string;
      logoUrl?: string;
      id?: number | string;
      crestId?: number;
    }
  | null
  | undefined;

function teamName(team: TeamLike): string {
  if (typeof team === "string") return team;
  return team?.name ?? "";
}

function numericId(team: TeamLike): number | null {
  if (typeof team !== "object" || team === null) return null;
  const raw = team.crestId ?? (typeof team.id === "number" ? team.id : undefined);
  return typeof raw === "number" && raw > 0 ? raw : null;
}

export function getTeamLogo(team: TeamLike): string {
  // P1: API-provided logo
  if (typeof team === "object" && team !== null) {
    const direct = team.logo ?? team.logoUrl;
    if (direct) return direct;
  }
  // P2: football-data.org crest by numeric id
  const id = numericId(team);
  if (id) return `https://crests.football-data.org/${id}.png`;
  // P3: known name → crest map
  const KNOWN: Record<string, string> = {
    Galatasaray: "https://crests.football-data.org/610.png",
    Fenerbahce: "https://crests.football-data.org/611.png",
    "Fenerbahçe": "https://crests.football-data.org/611.png",
    Besiktas: "https://crests.football-data.org/109.png",
    "Beşiktaş": "https://crests.football-data.org/109.png",
    Trabzonspor: "https://crests.football-data.org/666.png",
    "Man City": "https://crests.football-data.org/65.png",
    "Manchester City": "https://crests.football-data.org/65.png",
    Arsenal: "https://crests.football-data.org/57.png",
    Liverpool: "https://crests.football-data.org/64.png",
    Brighton: "https://crests.football-data.org/397.png",
    "Real Madrid": "https://crests.football-data.org/86.png",
    Barcelona: "https://crests.football-data.org/81.png",
    "Al Nassr": "https://crests.football-data.org/638.png",
    "Al Hilal": "https://crests.football-data.org/673.png",
    "Mogadishu City": "https://flagcdn.com/w80/so.png",
    Horseed: "https://flagcdn.com/w80/so.png",
  };
  const key = teamName(team);
  if (KNOWN[key]) return KNOWN[key];
  return ""; // empty = TeamLogo renders initials circle
}

/** League crests are not on the team-crest CDN; use the country flag. */
export function getLeagueLogo(league: {
  logo?: string;
  countryCode?: string;
  country?: string;
} | null | undefined): string {
  if (league?.logo) return league.logo;
  const iso = (league?.countryCode ?? "").toLowerCase();
  if (iso) return `https://flagcdn.com/w80/${iso}.png`;
  void league?.country;
  return "";
}

export function teamInitials(team: TeamLike): string {
  const n = teamName(team) || "?";
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Stable hash → hue for the initials badge background. */
export function teamColor(team: TeamLike): string {
  const n = teamName(team) || "?";
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 35%)`;
}
