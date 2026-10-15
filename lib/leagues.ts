// ─────────────────────────────────────────────────────────────
// JUM Football · canonical club→league LOOKUP layer (§3).
// NOT display data — real fixtures always come from /api/live.
// This powers filters, grouping and browse. A fixture's group is
// resolved by matching its API league field through this map.
// Unknown leagues → "Other", NEVER merged into "Global".
//
// Team shape: { id, name, short, league, countryCode, logoUrl } —
// logoUrl empty → TeamLogo initials fallback.
// ─────────────────────────────────────────────────────────────

export interface CanonicalTeam {
  id: string;
  name: string;
  short: string;
  league: string; // canonical league key (see LEAGUE_DEFS)
  countryCode: string;
  logoUrl: string; // "" → initials badge
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const team = (
  name: string,
  short: string,
  league: string,
  cc: string,
  logoUrl = ""
): CanonicalTeam => ({ id: slug(name), name, short, league, countryCode: cc, logoUrl });

export interface LeagueDef {
  key: string;
  name: string;
  flag: string; // emoji
  countryCode: string;
  confed: string; // UEFA | CONMEBOL | CAF | AFC | CONCACAF | OFC
}

export const LEAGUE_DEFS: LeagueDef[] = [
  { key: "turkish-super-lig", name: "Turkish Super Lig", flag: "🇹🇷", countryCode: "TR", confed: "UEFA" },
  { key: "premier-league", name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", countryCode: "EN", confed: "UEFA" },
  { key: "la-liga", name: "La Liga", flag: "🇪🇸", countryCode: "ES", confed: "UEFA" },
  { key: "serie-a", name: "Serie A", flag: "🇮🇹", countryCode: "IT", confed: "UEFA" },
  { key: "bundesliga", name: "Bundesliga", flag: "🇩🇪", countryCode: "DE", confed: "UEFA" },
  { key: "ligue-1", name: "Ligue 1", flag: "🇫🇷", countryCode: "FR", confed: "UEFA" },
  { key: "saudi-pro-league", name: "Saudi Pro League", flag: "🇸🇦", countryCode: "SA", confed: "AFC" },
  { key: "brasileirao-serie-a", name: "Brasileirão Série A", flag: "🇧🇷", countryCode: "BR", confed: "CONMEBOL" },
  { key: "mls", name: "MLS", flag: "🇺🇸", countryCode: "US", confed: "CONCACAF" },
  { key: "caf-competitions", name: "CAF Competitions", flag: "🌍", countryCode: "CAF", confed: "CAF" },
  { key: "uefa-champions-league", name: "UEFA Champions League", flag: "🇪🇺", countryCode: "UCL", confed: "UEFA" },
  { key: "uefa-europa-league", name: "UEFA Europa League", flag: "🇪🇺", countryCode: "UEL", confed: "UEFA" },
  { key: "eredivisie", name: "Eredivisie", flag: "🇳🇱", countryCode: "NL", confed: "UEFA" },
  { key: "primeira-liga", name: "Primeira Liga", flag: "🇵🇹", countryCode: "PT", confed: "UEFA" },
  { key: "scottish-premiership", name: "Scottish Premiership", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", countryCode: "SCT", confed: "UEFA" },
  { key: "j1-league", name: "J1 League", flag: "🇯🇵", countryCode: "JP", confed: "AFC" },
  { key: "k-league-1", name: "K League 1", flag: "🇰🇷", countryCode: "KR", confed: "AFC" },
  { key: "a-league-men", name: "A-League Men", flag: "🇦🇺", countryCode: "AU", confed: "AFC" },
  { key: "liga-mx", name: "Liga MX", flag: "🇲🇽", countryCode: "MX", confed: "CONCACAF" },
  { key: "primera-division", name: "Argentine Primera", flag: "🇦🇷", countryCode: "AR", confed: "CONMEBOL" },
];

export const LEAGUE_BY_KEY: Record<string, LeagueDef> = Object.fromEntries(
  LEAGUE_DEFS.map((d) => [d.key, d])
);

/* ── Clubs, filed under their canonical league ────────────── */

const TR = "turkish-super-lig";
const SA = "saudi-pro-league";
const EN = "premier-league";
const IT = "serie-a";
const BR = "brasileirao-serie-a";
const US = "mls";
const CAF = "caf-competitions";

export const TEAMS: CanonicalTeam[] = [
  // Turkish Super Lig
  team("Galatasaray", "GAL", TR, "TR"), team("Fenerbahçe", "FEN", TR, "TR"),
  team("Beşiktaş", "BJK", TR, "TR"), team("Trabzonspor", "TRA", TR, "TR"),
  team("Başakşehir", "BAS", TR, "TR"), team("Sivasspor", "SIV", TR, "TR"),
  team("Konyaspor", "KON", TR, "TR"), team("Alanyaspor", "ALA", TR, "TR"),
  team("Kayserispor", "KAY", TR, "TR"), team("Antalyaspor", "ANT", TR, "TR"),
  team("Gaziantep", "GAZ", TR, "TR"), team("Samsunspor", "SAM", TR, "TR"),
  team("Rizespor", "RIZ", TR, "TR"), team("Kasımpaşa", "KAS", TR, "TR"),
  team("Hatayspor", "HAT", TR, "TR"), team("Göztepe", "GOZ", TR, "TR"),
  team("Eyüpspor", "EYU", TR, "TR"), team("Bodrum FK", "BOD", TR, "TR"),
  // Saudi Pro League
  team("Al Nassr", "NAS", SA, "SA"), team("Al Hilal", "HIL", SA, "SA"),
  team("Al Ittihad", "ITT", SA, "SA"), team("Al Ahli", "AHL", SA, "SA"),
  team("Al Ettifaq", "ETT", SA, "SA"), team("Al Taawoun", "TAW", SA, "SA"),
  team("Al Fateh", "FAT", SA, "SA"), team("Al Khaleej", "KHA", SA, "SA"),
  team("Damac", "DAM", SA, "SA"), team("Al Feiha", "FEI", SA, "SA"),
  team("Al Okhdood", "OKH", SA, "SA"), team("Al Riyadh", "RIY", SA, "SA"),
  team("Al Shabab", "SHB", SA, "SA"), team("Al Quadisiya", "QAD", SA, "SA"),
  // Premier League (20)
  team("Arsenal", "ARS", EN, "EN"), team("Aston Villa", "AVL", EN, "EN"),
  team("Bournemouth", "BOU", EN, "EN"), team("Brentford", "BRE", EN, "EN"),
  team("Brighton", "BHA", EN, "EN"), team("Chelsea", "CHE", EN, "EN"),
  team("Crystal Palace", "CRY", EN, "EN"), team("Everton", "EVE", EN, "EN"),
  team("Fulham", "FUL", EN, "EN"), team("Ipswich Town", "IPS", EN, "EN"),
  team("Leicester City", "LEI", EN, "EN"), team("Liverpool", "LIV", EN, "EN"),
  team("Man City", "MCI", EN, "EN"), team("Man United", "MUN", EN, "EN"),
  team("Newcastle", "NEW", EN, "EN"), team("Nottingham Forest", "NFO", EN, "EN"),
  team("Southampton", "SOU", EN, "EN"), team("Tottenham", "TOT", EN, "EN"),
  team("West Ham", "WHU", EN, "EN"), team("Wolves", "WOL", EN, "EN"),
  // Serie A (20)
  team("Atalanta", "ATA", IT, "IT"), team("Bologna", "BOL", IT, "IT"),
  team("Cagliari", "CAG", IT, "IT"), team("Como", "COM", IT, "IT"),
  team("Empoli", "EMP", IT, "IT"), team("Fiorentina", "FIO", IT, "IT"),
  team("Genoa", "GEN", IT, "IT"), team("Hellas Verona", "VER", IT, "IT"),
  team("Inter", "INT", IT, "IT"), team("Juventus", "JUV", IT, "IT"),
  team("Lazio", "LAZ", IT, "IT"), team("Lecce", "LEC", IT, "IT"),
  team("AC Milan", "MIL", IT, "IT"), team("Monza", "MON", IT, "IT"),
  team("Napoli", "NAP", IT, "IT"), team("Parma", "PAR", IT, "IT"),
  team("Roma", "ROM", IT, "IT"), team("Torino", "TOR", IT, "IT"),
  team("Udinese", "UDI", IT, "IT"), team("Venezia", "VEN", IT, "IT"),
  // Brasileirão Série A (20)
  team("Athletico-PR", "CAP", BR, "BR"), team("Atlético Mineiro", "CAM", BR, "BR"),
  team("Bahia", "BAH", BR, "BR"), team("Botafogo", "BOT", BR, "BR"),
  team("Ceará", "CEA", BR, "BR"), team("Corinthians", "COR", BR, "BR"),
  team("Cruzeiro", "CRU", BR, "BR"), team("Flamengo", "FLA", BR, "BR"),
  team("Fluminense", "FLU", BR, "BR"), team("Fortaleza", "FOR", BR, "BR"),
  team("Grêmio", "GRE", BR, "BR"), team("Internacional", "INT", BR, "BR"),
  team("Juventude", "JUV", BR, "BR"), team("Mirassol", "MIR", BR, "BR"),
  team("Palmeiras", "PAL", BR, "BR"), team("Red Bull Bragantino", "RBB", BR, "BR"),
  team("Santos", "SAN", BR, "BR"), team("São Paulo", "SAO", BR, "BR"),
  team("Sport Recife", "SPO", BR, "BR"), team("Vasco da Gama", "VAS", BR, "BR"),
  // MLS (29)
  team("Atlanta United", "ATL", US, "US"), team("Austin FC", "ATX", US, "US"),
  team("Charlotte FC", "CLT", US, "US"), team("Chicago Fire", "CHI", US, "US"),
  team("Colorado Rapids", "COL", US, "US"), team("Columbus Crew", "CLB", US, "US"),
  team("D.C. United", "DCU", US, "US"), team("FC Cincinnati", "CIN", US, "US"),
  team("FC Dallas", "DAL", US, "US"), team("Houston Dynamo", "HOU", US, "US"),
  team("Inter Miami", "MIA", US, "US"), team("LA Galaxy", "LAG", US, "US"),
  team("LAFC", "LAFC", US, "US"), team("Minnesota United", "MIN", US, "US"),
  team("Nashville SC", "NSH", US, "US"), team("New England Revolution", "NER", US, "US"),
  team("NYCFC", "NYC", US, "US"), team("NY Red Bulls", "NYR", US, "US"),
  team("Orlando City", "ORL", US, "US"), team("Philadelphia Union", "PHI", US, "US"),
  team("Portland Timbers", "POR", US, "US"), team("Real Salt Lake", "RSL", US, "US"),
  team("San Diego FC", "SDG", US, "US"), team("San Jose Earthquakes", "SJE", US, "US"),
  team("Seattle Sounders", "SEA", US, "US"), team("Sporting KC", "SKC", US, "US"),
  team("St. Louis City", "STL", US, "US"), team("Toronto FC", "TOR", US, "US"),
  team("Vancouver Whitecaps", "VAN", US, "US"),
  // CAF — filed under CAF Competitions (AFCON + CAF CL/Confed Cup).
  // Never mixed with European/Middle-Eastern leagues.
  team("Al Ahly", "AHL", CAF, "EG"), team("Zamalek", "ZAM", CAF, "EG"),
  team("Wydad AC", "WYD", CAF, "MA"), team("Raja CA", "RAJ", CAF, "MA"),
  team("Espérance", "EST", CAF, "TN"), team("Mamelodi Sundowns", "SUN", CAF, "ZA"),
  team("Kaizer Chiefs", "CHI", CAF, "ZA"), team("Orlando Pirates", "PIR", CAF, "ZA"),
  team("TP Mazembe", "MAZ", CAF, "CD"), team("Gor Mahia", "GOR", CAF, "KE"),
  team("Tusker", "TUS", CAF, "KE"), team("Simba", "SIM", CAF, "TZ"),
];

export const TEAM_BY_ID: Record<string, CanonicalTeam> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);

/* ── Grouping: fixture league → canonical group ──────────────
   api-sports returns league names; we map them to canonical keys.
   Anything unmatched lands in "Other" — never "Global". */

const LEAGUE_NAME_TO_KEY: Record<string, string> = Object.fromEntries([
  // Turkish Super Lig
  ["Turkish Super Lig", "turkish-super-lig"], ["Süper Lig", "turkish-super-lig"], ["Super Lig", "turkish-super-lig"],
  // England
  ["Premier League", "premier-league"],
  // Spain
  ["La Liga", "la-liga"], ["Primera División", "la-liga"],
  // Italy
  ["Serie A", "serie-a"],
  // Germany
  ["Bundesliga", "bundesliga"],
  // France
  ["Ligue 1", "ligue-1"],
  // Saudi
  ["Saudi Pro League", "saudi-pro-league"], ["Professional League", "saudi-pro-league"],
  // Brazil
  ["Serie A Brazil", "brasileirao-serie-a"], ["Brasileirão Série A", "brasileirao-serie-a"], ["Brasileirao Serie A", "brasileirao-serie-a"],
  // MLS
  ["MLS", "mls"], ["Major League Soccer", "mls"],
  // CAF competitions — everything CAF files here, never under Global
  ["CAF Champions League", "caf-competitions"], ["CAF Confederation Cup", "caf-competitions"],
  ["Africa Cup of Nations", "caf-competitions"], ["AFCON", "caf-competitions"],
  ["AFCON Qualification", "caf-competitions"],
  // UEFA club comps
  ["UEFA Champions League", "uefa-champions-league"], ["UEFA Europa League", "uefa-europa-league"],
  ["Champions League", "uefa-champions-league"], ["Europa League", "uefa-europa-league"],
  // Netherlands / Portugal / Scotland
  ["Eredivisie", "eredivisie"], ["Primeira Liga", "primeira-liga"], ["Scottish Premiership", "scottish-premiership"],
  // Japan / Korea / Australia
  ["J1 League", "j1-league"], ["K League 1", "k-league-1"], ["A-League Men", "a-league-men"], ["A-League", "a-league-men"],
  // Mexico / Argentina
  ["Liga MX", "liga-mx"], ["Primera División Argentina", "primera-division"], ["Primera Nacional", "primera-division"],
]);

/** Resolve an api-sports league name to a canonical key. Unknown → "other". */
export function leagueKeyFromName(name: string): string {
  return LEAGUE_NAME_TO_KEY[name] ?? "other";
}

/** Display label for a fixture's canonical group. Unknown → "Other". */
export function leagueGroupLabel(key: string): string {
  if (key === "other") return "Other";
  return LEAGUE_BY_KEY[key]?.name ?? "Other";
}
