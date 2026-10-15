// ─────────────────────────────────────────────────────────────
// JUM Football · /live data — all leagues live matches
// Exact structure per spec; consumed by app/live/page.tsx only.
// ─────────────────────────────────────────────────────────────

export const LEAGUES_ALL = [
  { id: 39, name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: 140, name: "La Liga", flag: "🇪🇸" },
  { id: 135, name: "Serie A", flag: "🇮🇹" },
  { id: 78, name: "Bundesliga", flag: "🇩🇪" },
  { id: 203, name: "Super Lig", flag: "🇹🇷" },
  { id: 307, name: "Saudi Pro League", flag: "🇸🇦" },
  { id: 9991, name: "Somali Premier League", flag: "🇸🇴" },
  { id: 9992, name: "Kenyan Premier League", flag: "🇰🇪" },
  { id: 71, name: "Brazilian Serie A", flag: "🇧🇷" },
  { id: 2, name: "Champions League", flag: "🇪🇺" },
];

export interface LiveMatch {
  id: number;
  league: string;
  flag: string;
  minute: number;
  status: "LIVE" | "HT" | "FT";
  home: string;
  away: string;
  homeLogo: string;
  awayLogo: string;
  score: string;
  scorers: string;
  /** empty = simulated broadcast; future HLS stream drops in with zero UI changes */
  videoUrl: string;
  momentum?: number[];
}

export const MOCK_LIVE_MATCHES: LiveMatch[] = [
  {
    id: 1,
    league: "Super Lig",
    flag: "🇹🇷",
    minute: 78,
    status: "LIVE",
    videoUrl: "",
    home: "Galatasaray",
    away: "Fenerbahce",
    homeLogo: "https://crests.football-data.org/610.png",
    awayLogo: "https://crests.football-data.org/611.png",
    score: "2-1",
    scorers: "Icardi 34', 67' — Dzeko 12'",
    momentum: [10, 20, 35, 30, 50, 65, 60, 80, 75, 90],
  },
  {
    id: 2,
    league: "Premier League",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    minute: 61,
    status: "LIVE",
    videoUrl: "",
    home: "Arsenal",
    away: "Man City",
    homeLogo: "https://crests.football-data.org/57.png",
    awayLogo: "https://crests.football-data.org/65.png",
    score: "1-1",
    scorers: "Saka 23' — Haaland 45'",
    momentum: [40, 35, 55, 60, 45, 70, 65, 50, 75, 60],
  },
  {
    id: 3,
    league: "Kenyan Premier League",
    flag: "🇰🇪",
    minute: 55,
    status: "LIVE",
    videoUrl: "",
    home: "Gor Mahia",
    away: "Tusker",
    homeLogo: "",
    awayLogo: "",
    score: "1-0",
    scorers: "Omala 18'",
    momentum: [30, 45, 40, 60, 55, 70, 65, 80, 70, 85],
  },
  {
    id: 4,
    league: "Champions League",
    flag: "🇪🇺",
    minute: 33,
    status: "LIVE",
    videoUrl: "",
    home: "Real Madrid",
    away: "Bayern",
    homeLogo: "https://crests.football-data.org/86.png",
    awayLogo: "https://crests.football-data.org/5.png",
    score: "0-0",
    scorers: "",
    momentum: [50, 55, 45, 60, 50, 65, 55, 60, 50, 55],
  },
  {
    id: 5,
    league: "Somali Premier League",
    flag: "🇸🇴",
    minute: 70,
    status: "LIVE",
    videoUrl: "",
    home: "Dekedaha",
    away: "Horseed",
    homeLogo: "",
    awayLogo: "",
    score: "2-2",
    scorers: "Muse 9', 51' — Ali 22', 63'",
    momentum: [60, 50, 70, 55, 80, 65, 75, 60, 85, 70],
  },
];

// ── Live watch: mock commentary templates per match (cycled, newest on top) ──

export const COMMENTARY: Record<number, string[]> = {
  1: [
    "GOAL! Icardi scores for Galatasaray ⚽",
    "Fenerbahce corner — headed clear by Nelsson",
    "Torreira wins the ball in midfield",
    "Tadic curls one wide of the post",
    "Icardi brought down — free kick Galatasaray",
    "Muslera claims the cross calmly",
    "Dzeko turns and shoots — blocked!",
    "The derby crowd is deafening 🟨🟥",
  ],
  2: [
    "Haaland held up by Saliba — goal kick",
    "Saka drives inside and wins a corner",
    "De Bruyne threads one through — offside",
    "Arsenal pressing high in the City half",
    "Rice launches a long throw",
    "Ederson smothers at the near post",
    "Foden twists past two defenders",
    "Gabriel heads over from the corner",
  ],
  3: [
    "Omala races clear — flag stays down!",
    "Tusker piling on the pressure",
    "Gor Mahia break three-on-two",
    "The keeper claws it off the line!",
    "Midfield battle in Nairobi heat",
    "Tusker free kick 25 yards out",
    "Omala almost latches onto the through ball",
    "Gor Mahia fans in full voice 🟢",
  ],
  4: [
    "Vinicius skips past Kimmich",
    "Kane drops deep to link play",
    "Courtois gathers the cross",
    "Madrid counter — Bellingham carries",
    "Upamecano slides in to stop the attack",
    "Corner Real Madrid — tension builds",
    "Neuer claims under pressure",
    "End-to-end at the Bernabéu 🔥",
  ],
  5: [
    "Muse almost completes his hat-trick!",
    "Horseed level it from the spot",
    "Dekedaha's wingers are flying",
    "The keeper tips it over the bar",
    "Mogadishu derby living up to the name",
    "Ali curls one inches wide",
    "Long-range effort — saved!",
    "Five goals and counting in Somalia 🇸🇴",
  ],
};

export function liveMatchById(id: number): LiveMatch | undefined {
  return MOCK_LIVE_MATCHES.find((m) => m.id === id);
}
