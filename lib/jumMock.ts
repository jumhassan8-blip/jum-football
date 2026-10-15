// ─────────────────────────────────────────────────────────────
// JUM Football · product mock data (v3 — own identity)
// Confederations → countries → 60+ leagues. Components import
// from @/lib/api only. logoUrl intentionally empty (initials
// badges until a real API lands).
// ─────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  short: string;
  color: string;
  logoUrl: string;
  country: string;
  /** football-data.org crest id (real badge); falls back to initials on error */
  crestId?: number;
}

export interface League {
  id: string;
  name: string;
  country: string;
  confederation: string; // UEFA | CONMEBOL | CAF | AFC | CONCACAF | OFC
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  goals: number;
  assists: number;
  rating: number;
}

export interface MatchEvent {
  minute: number;
  side: "home" | "away";
  type: "goal" | "red" | "yellow" | "penalty" | "var";
  text: string;
  probShift: { h: number; d: number; a: number }; // applied to win probability
}

export interface Match {
  id: string;
  leagueId: string;
  round: string;
  day: "yesterday" | "today" | "tomorrow";
  dateLabel: string;
  status: "ft" | "live" | "ht" | "ns";
  minute?: number;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  homeScorers?: string[];
  awayScorers?: string[];
  tipsters: number;
  winChance?: { home: number; draw: number; away: number }; // model win-probability projection
  events?: MatchEvent[]; // live matches only
  reactions?: { wow: number; fire: number; goal: number }; // seeded crowd meter
  momentum?: number; // -100 away .. +100 home
}

export interface NewsItem {
  id: string;
  title: string;
  image: string;
  fire: number;
  comments: number;
  time: string;
  tag?: string;
}



// ── Confederations → countries → leagues ─────────────────────

const CONFED: [string, [string, string[]][]][] = [
  [
    "UEFA",
    [
      ["England", ["Premier League", "Championship", "League One", "FA Cup", "EFL Cup"]],
      ["Spain", ["La Liga", "La Liga 2", "Copa del Rey"]],
      ["Germany", ["Bundesliga", "2. Bundesliga", "DFB Pokal"]],
      ["Italy", ["Serie A", "Serie B", "Coppa Italia"]],
      ["France", ["Ligue 1", "Ligue 2", "Coupe de France"]],
      ["Turkey", ["Turkish Super Lig", "Turkish Cup", "1. Lig"]],
      ["Portugal", ["Primeira Liga", "Liga Portugal 2", "Taca de Portugal"]],
      ["Netherlands", ["Eredivisie", "Eerste Divisie", "KNVB Cup"]],
      ["Scotland", ["Scottish Premiership", "Scottish Cup"]],
      ["Belgium", ["Pro League", "Belgian Cup"]],
      ["Austria", ["Bundesliga", "OFB Cup"]],
      ["Switzerland", ["Super League", "Swiss Cup"]],
      ["Greece", ["Super League Greece", "Greek Cup"]],
      ["Poland", ["Ekstraklasa", "Polish Cup"]],
      ["Czechia", ["Czech First League", "Czech Cup"]],
      ["Ukraine", ["Premier League Ukraine"]],
      ["Serbia", ["SuperLiga Serbia"]],
      ["Croatia", ["HNL"]],
      ["Norway", ["Eliteserien"]],
      ["Sweden", ["Allsvenskan"]],
      ["Denmark", ["Superliga Denmark"]],
      ["Champions League", ["UEFA Champions League", "UEFA Europa League", "UEFA Conference League"]],
    ],
  ],
  [
    "CONMEBOL",
    [
      ["Brazil", ["Brasileirao Serie A", "Serie B", "Copa do Brasil"]],
      ["Argentina", ["Primera Division", "Copa Argentina"]],
      ["Chile", ["Primera Division Chile"]],
      ["Colombia", ["Primera A"]],
      ["Uruguay", ["Primera Division Uruguay"]],
      ["Peru", ["Liga 1"]],
      ["Ecuador", ["Serie A Ecuador"]],
      ["Copa Libertadores", ["CONMEBOL Libertadores", "CONMEBOL Sudamericana"]],
    ],
  ],
  [
    "CAF",
    [
      ["Egypt", ["Egyptian Premier League", "Egypt Cup"]],
      ["Morocco", ["Botola Pro"]],
      ["Algeria", ["Ligue 1 Algeria"]],
      ["Tunisia", ["Ligue Professionnelle 1"]],
      ["South Africa", ["Betway Premiership"]],
      ["Nigeria", ["Nigeria Premier League"]],
      ["Ghana", ["Ghana Premier League"]],
      ["Senegal", ["Ligue 1 Senegal"]],
      ["CAF Competitions", ["CAF Champions League", "CAF Confederation Cup", "AFCON Qualifiers"]],
    ],
  ],
  [
    "AFC",
    [
      ["Saudi Arabia", ["Saudi Pro League", "King Cup"]],
      ["Japan", ["J1 League", "Levain Cup", "Emperor's Cup"]],
      ["South Korea", ["K League 1", "Korean FA Cup"]],
      ["China", ["Chinese Super League"]],
      ["UAE", ["UAE Pro League"]],
      ["Qatar", ["Qatar Stars League"]],
      ["India", ["Indian Super League", "I-League"]],
      ["Australia", ["A-League Men"]],
      ["Iran", ["Persian Gulf Pro League"]],
      ["Iraq", ["Iraqi Stars League"]],
      ["AFC Competitions", ["AFC Champions League Elite", "AFC Cup"]],
    ],
  ],
  [
    "CONCACAF",
    [
      ["United States", ["MLS", "US Open Cup"]],
      ["Mexico", ["Liga MX", "Liga MX Femenil", "Copa MX"]],
      ["Canada", ["Canadian Premier League"]],
      ["CONCACAF Competitions", ["Champions Cup", "Leagues Cup", "Gold Cup Qualifiers"]],
    ],
  ],
  ["OFC", [["New Zealand", ["New Zealand National League"]]]],
];

export const CONFEDERATIONS = CONFED.map(([name]) => name);

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const LEAGUES: League[] = CONFED.flatMap(([confed, countries]) =>
  countries.flatMap(([country, leagues]) =>
    leagues.map((name) => ({
      id: slug(name),
      name,
      country,
      confederation: confed,
    }))
  )
);

/** Leagues in the top-row quick list (ids). */
export const TOP_ROW: { id: string; label: string; group?: string[] }[] = [
  { id: "main", label: "Main" },
  { id: "caf-competitions", label: "CAF" },
  { id: "turkish-super-lig", label: "Turkish SL" },
  {
    id: "afcon",
    label: "AFCON",
    group: ["afcon-qualifiers"],
  },
  { id: "premier-league", label: "EPL" },
  { id: "la-liga", label: "La Liga" },
  { id: "bundesliga", label: "Bundesliga" },
  { id: "serie-a", label: "Serie A" },
  { id: "ligue-1", label: "Ligue 1" },
  { id: "saudi-pro-league", label: "SPL" },
  { id: "mls", label: "MLS" },
  { id: "indian-super-league", label: "ISL" },
  { id: "uefa-champions-league", label: "UCL" },
];

export const LEAGUE_BY_ID = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));

// ── Teams ────────────────────────────────────────────────────

export const TEAMS: Team[] = [
  { id: "gs", name: "Galatasaray", short: "GAL", color: "#A32638", logoUrl: "", country: "Turkey" },
  { id: "fb", name: "Fenerbahce", short: "FEN", color: "#FFED00", logoUrl: "", country: "Turkey" },
  { id: "bjk", name: "Besiktas", short: "BJK", color: "#8A8F98", logoUrl: "", country: "Turkey" },
  { id: "ts", name: "Trabzonspor", short: "TRA", color: "#6B0F1A", logoUrl: "", country: "Turkey" },
  { id: "nas", name: "Al Nassr", short: "NAS", color: "#E8C547", logoUrl: "", country: "Saudi Arabia" },
  { id: "hil", name: "Al Hilal", short: "HIL", color: "#2D6CDF", logoUrl: "", country: "Saudi Arabia" },
  { id: "itt", name: "Al Ittihad", short: "ITT", color: "#111111", logoUrl: "", country: "Saudi Arabia" },
  { id: "mci", name: "Man City", short: "MCI", color: "#6CABDD", logoUrl: "", country: "England", crestId: 50 },
  { id: "ars", name: "Arsenal", short: "ARS", color: "#EF0107", logoUrl: "", country: "England", crestId: 42 },
  { id: "liv", name: "Liverpool", short: "LIV", color: "#C8102E", logoUrl: "", country: "England", crestId: 40 },
  { id: "che", name: "Chelsea", short: "CHE", color: "#034694", logoUrl: "", country: "England", crestId: 49 },
  { id: "bha", name: "Brighton", short: "BHA", color: "#0057B8", logoUrl: "", country: "England", crestId: 51 },
  { id: "new", name: "Newcastle", short: "NEW", color: "#3B3B3B", logoUrl: "", country: "England", crestId: 34 },
  { id: "avl", name: "Aston Villa", short: "AVL", color: "#7A003C", logoUrl: "", country: "England", crestId: 66 },
  { id: "rma", name: "Real Madrid", short: "RMA", color: "#8A7B2D", logoUrl: "", country: "Spain", crestId: 541 },
  { id: "bar", name: "Barcelona", short: "BAR", color: "#A50044", logoUrl: "", country: "Spain", crestId: 529 },
  { id: "atm", name: "Atletico Madrid", short: "ATM", color: "#CB3524", logoUrl: "", country: "Spain", crestId: 530 },
  { id: "sev", name: "Sevilla", short: "SEV", color: "#D90429", logoUrl: "", country: "Spain", crestId: 536 },
  { id: "val", name: "Valencia", short: "VAL", color: "#F18E00", logoUrl: "", country: "Spain", crestId: 532 },
  { id: "lev", name: "Levante", short: "LEV", color: "#C8373E", logoUrl: "", country: "Spain" },
  { id: "dek", name: "Dekedaha", short: "DEK", color: "#0E7A3D", logoUrl: "", country: "Somalia" },
  { id: "hor", name: "Horseed", short: "HOR", color: "#1D4ED8", logoUrl: "", country: "Somalia" },
  { id: "mgc", name: "Mogadishu City", short: "MGC", color: "#B45309", logoUrl: "", country: "Somalia" },
  { id: "bay", name: "Bayern Munich", short: "BAY", color: "#DC052D", logoUrl: "", country: "Germany", crestId: 172 },
  { id: "bvb", name: "Dortmund", short: "BVB", color: "#FDE100", logoUrl: "", country: "Germany", crestId: 165 },
  { id: "levk", name: "Leverkusen", short: "B04", color: "#E32221", logoUrl: "", country: "Germany", crestId: 168 },
  { id: "int", name: "Inter Milan", short: "INT", color: "#0068A8", logoUrl: "", country: "Italy", crestId: 505 },
  { id: "mil", name: "AC Milan", short: "MIL", color: "#FB090B", logoUrl: "", country: "Italy", crestId: 489 },
  { id: "juv", name: "Juventus", short: "JUV", color: "#9AA3AF", logoUrl: "", country: "Italy", crestId: 496 },
  { id: "nap", name: "Napoli", short: "NAP", color: "#12A0D7", logoUrl: "", country: "Italy", crestId: 492 },
  { id: "ata", name: "Atalanta", short: "ATA", color: "#1E71B8", logoUrl: "", country: "Italy", crestId: 499 },
  { id: "tor", name: "Torino", short: "TOR", color: "#8A1E1E", logoUrl: "", country: "Italy", crestId: 503 },
  { id: "udi", name: "Udinese", short: "UDI", color: "#8B8E94", logoUrl: "", country: "Italy", crestId: 494 },
  { id: "ven", name: "Venezia", short: "VEN", color: "#D5622B", logoUrl: "", country: "Italy" },
  { id: "psg", name: "PSG", short: "PSG", color: "#004170", logoUrl: "", country: "France", crestId: 85 },
  { id: "mar", name: "Marseille", short: "OM", color: "#2FAEE0", logoUrl: "", country: "France", crestId: 516 },
  { id: "mon", name: "Monaco", short: "ASM", color: "#E63329", logoUrl: "", country: "France", crestId: 473 },
  { id: "fla", name: "CR Flamengo", short: "FLA", color: "#C8102E", logoUrl: "", country: "Brazil" },
  { id: "flu", name: "Fluminense", short: "FLU", color: "#7A6A2B", logoUrl: "", country: "Brazil" },
  { id: "pal", name: "Palmeiras", short: "PAL", color: "#1FA055", logoUrl: "", country: "Brazil" },
  { id: "boc", name: "Boca Juniors", short: "BOC", color: "#0B1F5E", logoUrl: "", country: "Argentina" },
  { id: "riv", name: "River Plate", short: "RIV", color: "#EAEAEA", logoUrl: "", country: "Argentina" },
  { id: "alh", name: "Al Ahly", short: "AHL", color: "#C8102E", logoUrl: "", country: "Egypt" },
  { id: "wyd", name: "Wydad AC", short: "WAC", color: "#C8102E", logoUrl: "", country: "Morocco" },
  { id: "mamel", name: "Mamelodi Sundowns", short: "SUN", color: "#FFC94D", logoUrl: "", country: "South Africa" },
  { id: "kaw", name: "Kawasaki Frontale", short: "KAW", color: "#5CC5E6", logoUrl: "", country: "Japan" },
  { id: "uls", name: "Ulsan HD", short: "ULS", color: "#1B5FBF", logoUrl: "", country: "South Korea" },
  { id: "mum", name: "Mumbai City", short: "MUM", color: "#6E8BFF", logoUrl: "", country: "India" },
  { id: "lafc", name: "LAFC", short: "LAFC", color: "#C8FF3D", logoUrl: "", country: "United States" },
  { id: "mia", name: "Inter Miami", short: "MIA", color: "#F7B5CD", logoUrl: "", country: "United States" },
  { id: "amer", name: "Club America", short: "AME", color: "#F7C100", logoUrl: "", country: "Mexico" },
];

// ── Matches ──────────────────────────────────────────────────

function relDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

const GOAL = (side: "home" | "away", minute: number, text: string, weight = 0.14): MatchEvent => ({
  minute,
  side,
  type: "goal",
  text,
  probShift: side === "home" ? { h: weight, d: -weight * 0.4, a: -weight * 0.6 } : { h: -weight * 0.6, d: -weight * 0.4, a: weight },
});

export const MATCHES: Match[] = [
  {
    id: "m-gs-fb",
    leagueId: "turkish-super-lig",
    round: "R10",
    day: "today",
    dateLabel: relDate(0),
    status: "live",
    minute: 64,
    homeId: "gs",
    awayId: "fb",
    homeScore: 1,
    awayScore: 2,
    homeScorers: ["Osimhen 18'"],
    awayScorers: ["Dzeko 9'", "Tadic 51'"],
    tipsters: 41,
    momentum: -25,
    reactions: { wow: 1284, fire: 3421, goal: 2180 },
    events: [
      GOAL("away", 9, "GOAL — Dzeko heads Fenerbahce in front"),
      GOAL("home", 18, "GOAL — Osimhen equalises with a thunderbolt"),
      { minute: 33, side: "away", type: "yellow", text: "Yellow card — Kahveci (FEN)", probShift: { h: 0.01, d: 0, a: -0.01 } },
      GOAL("away", 51, "GOAL — Tadic restores the lead"),
      { minute: 58, side: "home", type: "var", text: "VAR check — possible penalty for Gala… no penalty", probShift: { h: -0.03, d: 0.01, a: 0.02 } },
      { minute: 62, side: "home", type: "red", text: "RED CARD — Torreira sent off!", probShift: { h: -0.12, d: 0.02, a: 0.1 } },
    ],
    winChance: { home: 4.6, draw: 3.8, away: 1.72 },
  },
  {
    id: "m-nas-hil",
    leagueId: "saudi-pro-league",
    round: "R10",
    day: "today",
    dateLabel: relDate(0),
    status: "live",
    minute: 71,
    homeId: "nas",
    awayId: "hil",
    homeScore: 2,
    awayScore: 1,
    homeScorers: ["Ronaldo 24' (pen)", "Mané 55'"],
    awayScorers: ["Mitrovic 38'"],
    tipsters: 17,
    momentum: 40,
    reactions: { wow: 940, fire: 5102, goal: 3994 },
    events: [
      GOAL("home", 24, "PENALTY GOAL — Ronaldo converts"),
      GOAL("away", 38, "GOAL — Mitrovic levels"),
      GOAL("home", 55, "GOAL — Mané puts Al Nassr back ahead"),
      { minute: 66, side: "away", type: "yellow", text: "Yellow card — Kanno (HIL)", probShift: { h: 0.01, d: 0, a: -0.01 } },
    ],
    winChance: { home: 1.62, draw: 4.1, away: 5.2 },
  },
  {
    id: "m-mci-ars",
    leagueId: "premier-league",
    round: "R8",
    day: "today",
    dateLabel: relDate(0),
    status: "ns",
    homeId: "mci",
    awayId: "ars",
    homeScore: 0,
    awayScore: 0,
    tipsters: 128,
    winChance: { home: 2.05, draw: 3.6, away: 3.4 },
  },
  {
    id: "m-bar-rma",
    leagueId: "la-liga",
    round: "R9",
    day: "today",
    dateLabel: relDate(0),
    status: "ns",
    homeId: "bar",
    awayId: "rma",
    homeScore: 0,
    awayScore: 0,
    tipsters: 96,
    winChance: { home: 2.4, draw: 3.5, away: 2.9 },
  },
  {
    id: "m-tor-udi",
    leagueId: "serie-a",
    round: "R7",
    day: "today",
    dateLabel: relDate(0),
    status: "ft",
    homeId: "tor",
    awayId: "udi",
    homeScore: 1,
    awayScore: 0,
    homeScorers: ["Jorge Carrascal 65'"],
    tipsters: 2,
  },
  {
    id: "m-bay-bvb",
    leagueId: "bundesliga",
    round: "R7",
    day: "today",
    dateLabel: relDate(0),
    status: "ns",
    homeId: "bay",
    awayId: "bvb",
    homeScore: 0,
    awayScore: 0,
    tipsters: 54,
    winChance: { home: 1.55, draw: 4.4, away: 5.6 },
  },
  {
    id: "m-fra-fla",
    leagueId: "brasileirao-serie-a",
    round: "R29",
    day: "yesterday",
    dateLabel: relDate(-1),
    status: "ft",
    homeId: "fla",
    awayId: "flu",
    homeScore: 2,
    awayScore: 1,
    homeScorers: ["Bruno Henrique 34'", "Pedro 78'"],
    awayScorers: ["Cano 60'"],
    tipsters: 12,
  },
  {
    id: "m-ata-ven",
    leagueId: "serie-a",
    round: "R6",
    day: "yesterday",
    dateLabel: relDate(-1),
    status: "ft",
    homeId: "ata",
    awayId: "ven",
    homeScore: 1,
    awayScore: 0,
    homeScorers: ["Lookman 22'"],
    tipsters: 0,
  },
  {
    id: "m-lafc-mia",
    leagueId: "mls",
    round: "R33",
    day: "tomorrow",
    dateLabel: relDate(1),
    status: "ns",
    homeId: "lafc",
    awayId: "mia",
    homeScore: 0,
    awayScore: 0,
    tipsters: 23,
    winChance: { home: 2.2, draw: 3.7, away: 2.95 },
  },
  {
    id: "m-alh-wyd",
    leagueId: "caf-champions-league",
    round: "Group MD2",
    day: "tomorrow",
    dateLabel: relDate(1),
    status: "ns",
    homeId: "alh",
    awayId: "wyd",
    homeScore: 0,
    awayScore: 0,
    tipsters: 8,
    winChance: { home: 1.85, draw: 3.4, away: 4.1 },
  },
];

// ── Players / scorers ────────────────────────────────────────

export const PLAYERS: Player[] = [
  { id: "p-osimhen", name: "Victor Osimhen", teamId: "gs", goals: 11, assists: 3, rating: 8.3 },
  { id: "p-dzeko", name: "Edin Dzeko", teamId: "fb", goals: 8, assists: 4, rating: 8.0 },
  { id: "p-ronaldo", name: "Cristiano Ronaldo", teamId: "nas", goals: 13, assists: 2, rating: 8.5 },
  { id: "p-haaland", name: "Erling Haaland", teamId: "mci", goals: 14, assists: 3, rating: 8.6 },
  { id: "p-saka", name: "Bukayo Saka", teamId: "ars", goals: 7, assists: 9, rating: 8.2 },
  { id: "p-yamal", name: "Lamine Yamal", teamId: "bar", goals: 8, assists: 10, rating: 8.4 },
  { id: "p-bellingham", name: "Jude Bellingham", teamId: "rma", goals: 9, assists: 6, rating: 8.7 },
  { id: "p-kane", name: "Harry Kane", teamId: "bay", goals: 15, assists: 7, rating: 8.8 },
  { id: "p-lautaro", name: "Lautaro Martinez", teamId: "int", goals: 11, assists: 3, rating: 8.1 },
  { id: "p-messi", name: "Lionel Messi", teamId: "mia", goals: 18, assists: 12, rating: 9.0 },
  { id: "p-salah", name: "Mohamed Salah", teamId: "liv", goals: 10, assists: 8, rating: 8.4 },
  { id: "p-mitrovic", name: "Aleksandar Mitrovic", teamId: "hil", goals: 10, assists: 2, rating: 8.2 },
];

// ── News ─────────────────────────────────────────────────────

export const TRENDING_NEWS: NewsItem[] = [
  { id: "n1", title: "Ballon d'Or 2026: the 30-man shortlist revealed — three shock inclusions", image: "linear-gradient(135deg,#3D1A5E,#151A21)", fire: 42, comments: 1284, time: "2 h ago" },
  { id: "n2", title: "Galatasaray confirm Carrascal signing as Fenerbahce derby looms", image: "linear-gradient(135deg,#5E1020,#151A21)", fire: 31, comments: 967, tag: "Transfers", time: "3 h ago" },
  { id: "n3", title: "AFCON 2027: hosts named as qualification draw produces heavyweight groups", image: "linear-gradient(135deg,#0E3A2A,#151A21)", fire: 25, comments: 655, tag: "AFCON", time: "5 h ago" },
  { id: "n4", title: "Al Nassr's Ronaldo: 'Records are my fuel' after 13th goal of the season", image: "linear-gradient(135deg,#4A3A10,#151A21)", fire: 22, comments: 812, time: "6 h ago" },
  { id: "n5", title: "Premier League R8 preview: five storylines as City host Arsenal", image: "linear-gradient(135deg,#1B3A5E,#151A21)", fire: 19, comments: 743, time: "7 h ago" },
  { id: "n6", title: "MLS playoff race: Inter Miami's final-day drama explained", image: "linear-gradient(135deg,#3E1A2E,#151A21)", fire: 14, comments: 388, time: "9 h ago" },
  { id: "n7", title: "UCL League Phase: Barcelona set the pace as Bayern stumble in Lisbon", image: "linear-gradient(135deg,#1A1A3E,#151A21)", fire: 17, comments: 521, time: "10 h ago" },
  { id: "n8", title: "Brazil Serie A title race: Flamengo's remaining fixtures analysed", image: "linear-gradient(135deg,#3E1515,#151A21)", fire: 11, comments: 296, time: "12 h ago" },
  { id: "n9", title: "ISL: Mumbai City's academy pipeline keeps producing — meet the next crop", image: "linear-gradient(135deg,#152A3E,#151A21)", fire: 8, comments: 174, time: "14 h ago" },
  { id: "n10", title: "Bundesliga: Leverkusen's injury crisis deepens ahead of Klassiker", image: "linear-gradient(135deg,#3E2A15,#151A21)", fire: 9, comments: 203, time: "16 h ago" },
  { id: "n11", title: "Saudi SPL spending review: where the money went this window", image: "linear-gradient(135deg,#2E3A15,#151A21)", fire: 13, comments: 341, time: "18 h ago" },
  { id: "n12", title: "Ligue 1: PSG's unbeaten run under threat at a resurgent Marseille", image: "linear-gradient(135deg,#15153E,#151A21)", fire: 7, comments: 188, time: "20 h ago" },
];

export const LATEST_NEWS: NewsItem[] = [
  { id: "l1", title: "JUM Pulse explodes: 89k reactions in the Istanbul derby — a platform record", image: "linear-gradient(135deg,#2A3E15,#151A21)", fire: 24, comments: 1902, tag: "JUM", time: "20 min ago" },
  { id: "l2", title: "Injury blow for Barcelona as Gavi is ruled out for 'several weeks'", image: "linear-gradient(135deg,#3E0018,#151A21)", fire: 12, comments: 431, time: "1 h ago" },
  { id: "l3", title: "Brighton complete club-record swoop for 19-year-old wonderkid", image: "linear-gradient(135deg,#001A3E,#151A21)", fire: 6, comments: 158, tag: "Transfers", time: "4 h ago" },
  { id: "l4", title: "CAF CL: Al Ahly put four past Tanzania's Simba in Cairo rout", image: "linear-gradient(135deg,#3E1515,#151A21)", fire: 9, comments: 267, time: "5 h ago" },
];



// ── Standings (per league, top slices) ───────────────────────

export interface StandingRow {
  teamId: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export const STANDINGS: Record<string, StandingRow[]> = {
  "premier-league": [
    { teamId: "mci", p: 7, w: 6, d: 1, l: 0, gf: 19, ga: 6, pts: 19 },
    { teamId: "ars", p: 7, w: 5, d: 2, l: 0, gf: 16, ga: 7, pts: 17 },
    { teamId: "liv", p: 7, w: 5, d: 1, l: 1, gf: 15, ga: 8, pts: 16 },
    { teamId: "avl", p: 7, w: 4, d: 2, l: 1, gf: 13, ga: 9, pts: 14 },
    { teamId: "che", p: 7, w: 4, d: 1, l: 2, gf: 14, ga: 10, pts: 13 },
    { teamId: "new", p: 7, w: 3, d: 2, l: 2, gf: 11, ga: 9, pts: 11 },
  ],
  "la-liga": [
    { teamId: "bar", p: 8, w: 7, d: 1, l: 0, gf: 22, ga: 7, pts: 22 },
    { teamId: "rma", p: 8, w: 6, d: 1, l: 1, gf: 19, ga: 8, pts: 19 },
    { teamId: "atm", p: 8, w: 5, d: 2, l: 1, gf: 14, ga: 7, pts: 17 },
    { teamId: "sev", p: 8, w: 4, d: 2, l: 2, gf: 12, ga: 9, pts: 14 },
  ],
  "turkish-super-lig": [
    { teamId: "gs", p: 9, w: 7, d: 1, l: 1, gf: 21, ga: 8, pts: 22 },
    { teamId: "fb", p: 9, w: 7, d: 1, l: 1, gf: 19, ga: 7, pts: 22 },
    { teamId: "bjk", p: 9, w: 5, d: 2, l: 2, gf: 14, ga: 10, pts: 17 },
    { teamId: "ts", p: 9, w: 4, d: 2, l: 3, gf: 12, ga: 11, pts: 14 },
  ],
  "saudi-pro-league": [
    { teamId: "hil", p: 9, w: 7, d: 2, l: 0, gf: 20, ga: 7, pts: 23 },
    { teamId: "nas", p: 9, w: 7, d: 1, l: 1, gf: 22, ga: 9, pts: 22 },
    { teamId: "itt", p: 9, w: 5, d: 2, l: 2, gf: 15, ga: 10, pts: 17 },
  ],
  "serie-a": [
    { teamId: "nap", p: 7, w: 5, d: 2, l: 0, gf: 14, ga: 6, pts: 17 },
    { teamId: "int", p: 7, w: 5, d: 1, l: 1, gf: 15, ga: 8, pts: 16 },
    { teamId: "juv", p: 7, w: 4, d: 2, l: 1, gf: 11, ga: 7, pts: 14 },
    { teamId: "ata", p: 7, w: 4, d: 1, l: 2, gf: 13, ga: 9, pts: 13 },
    { teamId: "mil", p: 7, w: 3, d: 2, l: 2, gf: 12, ga: 10, pts: 11 },
  ],
  "brasileirao-serie-a": [
    { teamId: "pal", p: 28, w: 17, d: 7, l: 4, gf: 44, ga: 20, pts: 58 },
    { teamId: "fla", p: 28, w: 16, d: 8, l: 4, gf: 46, ga: 22, pts: 56 },
    { teamId: "flu", p: 28, w: 13, d: 8, l: 7, gf: 35, ga: 27, pts: 47 },
  ],
};

// ── Live chat ────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  fan: string;        // display name
  color: string;      // avatar color
  minute: number;
  text: string;
  likes: number;
  replies?: ChatMessage[];
  superFan?: boolean;
}

export const CHAT_SEED: Record<string, ChatMessage[]> = {
  "m-gs-fb": [
    { id: "c1", fan: "Emre53", color: "#A32638", minute: 12, text: "This derby is on fire, Torreira everywhere", likes: 214 },
    { id: "c2", fan: "KadikoyKing", color: "#FFED00", minute: 19, text: "OSIMHEN. THAT IS ALL.", likes: 489, superFan: true },
    { id: "c3", fan: "UltrasAslan", color: "#C8FF3D", minute: 31, text: "Dzeko never misses in big games", likes: 156 },
    { id: "c4", fan: "CananFB", color: "#6E8BFF", minute: 44, text: "Ref is letting everything go today", likes: 98 },
    { id: "c5", fan: "IcardiEra", color: "#FF5C8A", minute: 58, text: "Come on Gala, one more push!", likes: 132 },
  ],
  "m-nas-hil": [
    { id: "c1", fan: "RiyadhRoar", color: "#E8C547", minute: 9, text: "CR7 scoring at 41 is not talked about enough", likes: 342, superFan: true },
    { id: "c2", fan: "HilalFaithful", color: "#2D6CDF", minute: 26, text: "Mitrovic will get one back, trust", likes: 118 },
    { id: "c3", fan: "NassrNation", color: "#C8FF3D", minute: 40, text: "Mané is cooking on that left wing", likes: 87 },
  ],
};

// ── Poll seeds ───────────────────────────────────────────────

export const POLL_SEED: Record<string, { home: number; draw: number; away: number }> = {
  "m-gs-fb": { home: 41, draw: 9, away: 50 },
  "m-nas-hil": { home: 63, draw: 12, away: 25 },
  "m-mci-ars": { home: 38, draw: 24, away: 38 },
  "m-bar-rma": { home: 36, draw: 22, away: 42 },
};

// ── Raffles ──────────────────────────────────────────────────

export interface Raffle {
  id: string;
  matchId: string;
  prize: string;
  brandColor: string;
  /** shown once the match is FT — mock draw */
  winnerHandle?: string;
  closed: boolean;
}

export const RAFFLES: Raffle[] = [
  { id: "r1", matchId: "m-gs-fb", prize: "Win a Galatasaray jersey — predict the score to enter", brandColor: "#A32638", closed: false },
  { id: "r2", matchId: "m-nas-hil", prize: "Win a signed Ronaldo shirt — predict the score to enter", brandColor: "#E8C547", closed: false },
  { id: "r3", matchId: "m-fra-fla", prize: "Win a Flamengo third kit — score prediction entries closed", brandColor: "#C8102E", winnerHandle: "@FlaMengoMar", closed: true },
];

// ── Player lifestyle (direct images.unsplash.com URLs) ───────

export interface LifestylePost {
  id: string;
  title: string;
  image: string;
  likes: number;
  views: string;
  tag: "Mansions" | "Cars" | "Fashion" | "Travel" | "Training";
}

export const LIFESTYLE_POSTS: Record<string, LifestylePost[]> = {
  "p-messi": [
    { id: "ls1", title: "Inside Messi's $50M Miami mansion", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", likes: 48200, views: "2.1M", tag: "Mansions" },
    { id: "ls2", title: "Garage tour: the Porsche collection", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80", likes: 39100, views: "1.6M", tag: "Cars" },
    { id: "ls3", title: "Off-duty fits: Miami street style", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80", likes: 27800, views: "980K", tag: "Fashion" },
    { id: "ls4", title: "Yacht mornings in the Adriatic", image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80", likes: 33400, views: "1.2M", tag: "Travel" },
    { id: "ls5", title: "Home gym sessions at 6am", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80", likes: 19900, views: "760K", tag: "Training" },
    { id: "ls6", title: "Family compound: the full tour", image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80", likes: 25600, views: "1.1M", tag: "Mansions" },
  ],
  "p-ronaldo": [
    { id: "ls1", title: "CR7's Riyadh residence: 17 rooms", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", likes: 51400, views: "2.4M", tag: "Mansions" },
    { id: "ls2", title: "The Bugatti chapter of the collection", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80", likes: 44700, views: "1.9M", tag: "Cars" },
    { id: "ls3", title: "Suit game: tailored in Milan", image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", likes: 22900, views: "870K", tag: "Fashion" },
    { id: "ls4", title: "Recovery days in Marbella", image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80", likes: 26100, views: "1.0M", tag: "Travel" },
    { id: "ls5", title: "Night session under the lights", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80", likes: 18800, views: "700K", tag: "Training" },
  ],
  "p-haaland": [
    { id: "ls1", title: "Norwegian cabin life", image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80", likes: 21400, views: "810K", tag: "Mansions" },
    { id: "ls2", title: "Matchday arrival: all black everything", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80", likes: 17200, views: "640K", tag: "Cars" },
    { id: "ls3", title: "Erling's meditation corner", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80", likes: 14500, views: "520K", tag: "Training" },
  ],
};

/** Lifestyle fallback for players without a curated grid. */
export const LIFESTYLE_GENERIC: LifestylePost[] = [
  { id: "lg1", title: "Training ground: access all areas", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80", likes: 12300, views: "480K", tag: "Training" },
  { id: "lg2", title: "Matchday fits, ranked", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80", likes: 9800, views: "390K", tag: "Fashion" },
  { id: "lg3", title: "Off-season travels", image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80", likes: 8600, views: "310K", tag: "Travel" },
  { id: "lg4", title: "Home life, away from the noise", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", likes: 11200, views: "420K", tag: "Mansions" },
];

// ── Fans leaderboard seed (points from comments/activity) ────

export const FANS_SEED: { name: string; points: number; color: string }[] = [
  { name: "KadikoyKing", points: 1240, color: "#FFED00" },
  { name: "RiyadhRoar", points: 1115, color: "#E8C547" },
  { name: "Emre53", points: 980, color: "#A32638" },
  { name: "UltrasAslan", points: 873, color: "#C8FF3D" },
  { name: "CananFB", points: 764, color: "#6E8BFF" },
  { name: "IcardiEra", points: 701, color: "#FF5C8A" },
  { name: "HilalFaithful", points: 655, color: "#2D6CDF" },
  { name: "NassrNation", points: 590, color: "#C8FF3D" },
];
