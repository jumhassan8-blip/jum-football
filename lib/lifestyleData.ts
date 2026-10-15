// ─────────────────────────────────────────────────────────────
// JUM Football · premium features data — lifestyle feed, mock
// match engine, and match chat comments.
// ─────────────────────────────────────────────────────────────

export interface LifestylePost {
  id: number;
  player: string;
  avatar: string; // legacy field — avatars render as local initials (FanAvatar)
  team: string;
  category: "Cars" | "Mansions" | "Watches" | "Fashion" | "Family" | "Jets";
  title: string;
  image: string; // images.unsplash.com (direct)
  likes: number;
  views: string;
  price: string;
  brand: string;
  isVideo?: boolean;
}

export const LIFESTYLE_POSTS: LifestylePost[] = [
  {
    id: 1,
    player: "Erling Haaland",
    avatar: "local://avatar/haaland",
    team: "Man City",
    category: "Cars",
    title: "Haaland's new Bugatti Chiron — first look inside the garage",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    likes: 48200,
    views: "1.2M",
    price: "$3.3M",
    brand: "Bugatti",
  },
  {
    id: 2,
    player: "Cristiano Ronaldo",
    avatar: "local://avatar/ronaldo",
    team: "Al Nassr",
    category: "Mansions",
    title: "Full tour: CR7's 17-room Riyadh residence",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    likes: 91300,
    views: "2.4M",
    price: "$12M",
    brand: "Private Estate",
    isVideo: true,
  },
  {
    id: 3,
    player: "Lionel Messi",
    avatar: "local://avatar/messi",
    team: "Inter Miami",
    category: "Watches",
    title: "Messi's Patek Philippe Grandmaster — one of 7 in the world",
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80",
    likes: 62700,
    views: "1.8M",
    price: "$2.5M",
    brand: "Patek Philippe",
  },
  {
    id: 4,
    player: "Jude Bellingham",
    avatar: "local://avatar/bellingham",
    team: "Real Madrid",
    category: "Fashion",
    title: "Bellingham x Louis Vuitton: the Madrid capsule drop",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
    likes: 35400,
    views: "980K",
    price: "$8,400",
    brand: "Louis Vuitton",
  },
  {
    id: 5,
    player: "Neymar Jr",
    avatar: "local://avatar/neymar",
    team: "Al Hilal",
    category: "Jets",
    title: "Inside Neymar's Embraer Legacy 650 — game-day travel",
    image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80",
    likes: 74800,
    views: "2.1M",
    price: "$25M",
    brand: "Embraer",
    isVideo: true,
  },
];

// ── Mock match for the match engine ──────────────────────────

export interface MomentumPoint {
  m: number;
  h: number;
  a: number;
}

export interface MockMatch {
  id: number;
  league: string;
  home: string;
  away: string;
  homeCrest: string;
  awayCrest: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: "LIVE" | "HT" | "FT";
  scorers: string;
  momentum: MomentumPoint[];
}

export const MOCK_MATCHES: MockMatch[] = [
  {
    id: 1,
    league: "Super Lig",
    home: "Galatasaray",
    away: "Fenerbahce",
    homeCrest: "https://crests.football-data.org/610.png",
    awayCrest: "https://crests.football-data.org/611.png",
    homeScore: 2,
    awayScore: 1,
    minute: 78,
    status: "LIVE",
    scorers: "Icardi 34', 67' — Dzeko 12'",
    momentum: [
      { m: 0, h: 42, a: 45 },
      { m: 10, h: 48, a: 50 },
      { m: 20, h: 55, a: 52 },
      { m: 30, h: 50, a: 46 },
      { m: 45, h: 62, a: 48 },
      { m: 60, h: 70, a: 55 },
      { m: 78, h: 58, a: 30 },
    ],
  },
  {
    id: 2,
    league: "Premier League",
    home: "Arsenal",
    away: "Man City",
    homeCrest: "https://crests.football-data.org/57.png",
    awayCrest: "https://crests.football-data.org/65.png",
    homeScore: 1,
    awayScore: 1,
    minute: 61,
    status: "LIVE",
    scorers: "Saka 23' — Haaland 45'",
    momentum: [
      { m: 0, h: 50, a: 48 },
      { m: 10, h: 44, a: 52 },
      { m: 20, h: 56, a: 50 },
      { m: 30, h: 60, a: 46 },
      { m: 45, h: 45, a: 70 },
      { m: 60, h: 65, a: 50 },
      { m: 61, h: 58, a: 55 },
    ],
  },
  {
    id: 3,
    league: "Kenyan Premier League",
    home: "Gor Mahia",
    away: "Tusker",
    homeCrest: "",
    awayCrest: "",
    homeScore: 1,
    awayScore: 0,
    minute: 55,
    status: "LIVE",
    scorers: "Omala 18'",
    momentum: [
      { m: 0, h: 40, a: 50 },
      { m: 10, h: 46, a: 44 },
      { m: 20, h: 42, a: 55 },
      { m: 30, h: 60, a: 48 },
      { m: 45, h: 55, a: 50 },
      { m: 55, h: 70, a: 45 },
    ],
  },
  {
    id: 4,
    league: "Champions League",
    home: "Real Madrid",
    away: "Bayern",
    homeCrest: "https://crests.football-data.org/86.png",
    awayCrest: "https://crests.football-data.org/5.png",
    homeScore: 0,
    awayScore: 0,
    minute: 33,
    status: "LIVE",
    scorers: "",
    momentum: [
      { m: 0, h: 50, a: 50 },
      { m: 10, h: 55, a: 46 },
      { m: 20, h: 46, a: 58 },
      { m: 30, h: 60, a: 50 },
      { m: 33, h: 52, a: 48 },
    ],
  },
  {
    id: 5,
    league: "Somali Premier League",
    home: "Dekedaha",
    away: "Horseed",
    homeCrest: "",
    awayCrest: "",
    homeScore: 2,
    awayScore: 2,
    minute: 70,
    status: "LIVE",
    scorers: "Muse 9', 51' — Ali 22', 63'",
    momentum: [
      { m: 0, h: 55, a: 48 },
      { m: 10, h: 48, a: 55 },
      { m: 20, h: 62, a: 50 },
      { m: 30, h: 50, a: 58 },
      { m: 45, h: 70, a: 55 },
      { m: 60, h: 60, a: 52 },
      { m: 70, h: 65, a: 50 },
    ],
  },
];

export const MOCK_MATCH = MOCK_MATCHES[0];

export function mockMatchById(id: number): MockMatch | undefined {
  return MOCK_MATCHES.find((m) => m.id === id);
}

// ── Mock chat comments ───────────────────────────────────────

export interface ChatReply {
  id: number;
  user: string;
  avatar: string;
  badge?: "Top Fan" | "VIP" | null;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
}

export interface ChatComment extends ChatReply {
  replies: ChatReply[];
}

const C = (
  id: number,
  user: string,
  badge: "Top Fan" | "VIP" | null,
  text: string,
  time: string,
  likes: number,
  replies: ChatReply[] = []
): ChatComment => ({
  id,
  user,
  avatar: `local://avatar/${user.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
  badge,
  text,
  time,
  likes,
  liked: false,
  replies,
});

const R = (
  id: number,
  user: string,
  badge: "Top Fan" | "VIP" | null,
  text: string,
  time: string,
  likes: number
): ChatReply => ({
  id,
  user,
  avatar: `local://avatar/${user.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
  badge,
  text,
  time,
  likes,
  liked: false,
});

export const MOCK_COMMENTS: ChatComment[] = [
  C(1, "Emre53", "Top Fan", "This derby is absolutely on fire, Icardi is inevitable today", "78'", 214),
  C(2, "KadikoyKing", null, "OSIMHEN WOULD HAVE SCORED THAT. Still love this team though", "77'", 489),
  C(3, "CananFB", "VIP", "Ref is letting everything go today, how is that not a foul?", "76'", 98, [
    R(31, "UltrasAslan", null, "Derby refereeing, always the same story", "76'", 41),
    R(32, "Emre53", "Top Fan", "Both ways though, Torreira got away with one too", "75'", 28),
  ]),
  C(4, "IcardiEra", null, "Two goals, one passion. Icardi never misses in big games", "75'", 156),
  C(5, "RiyadhRoar", null, "Watching from Riyadh — Gala look unstoppable at home", "74'", 87),
  C(6, "DerbyAnalyst", "VIP", "Both teams scoring again — the model loves this game", "73'", 132),
  C(7, "UltrasAslan", null, "The crowd is deafening at RAMS Park 🟨🟥", "72'", 190),
  C(8, "MerveGS", null, "My heart can't take the last 15 minutes", "71'", 76),
  C(9, "TadicFan", null, "Tadic is still class, that pass before the corner was perfect", "70'", 64),
  C(10, "GalatasarayGL", "Top Fan", "If we hold this, top of the table tonight 🏆", "69'", 245),
  C(11, "NassrNation", null, "CR7 would be proud of that Icardi finish", "68'", 55),
  C(12, "DerbyDays", null, "I've watched this derby for 30 years, never gets old", "67'", 118),
  C(13, "FenerForever", null, "One goal and we're level. Believe.", "66'", 92),
  C(14, "HilalFaithful", null, "Saudi league fans watching the Turkish chaos 👀", "65'", 47),
  C(15, "IstanbulNight", null, "RAMS Park under the lights is a different planet", "64'", 83),
  C(16, "Torreira10", null, "Torreira won that ball CLEAN. Let them play", "63'", 71),
  C(17, "ScoutMemo", "VIP", "Gala's left overload is destroying the Fener back line", "62'", 104),
  C(18, "Ada1905", null, "Grandpa took me to my first derby here in 98. Same fire.", "61'", 139),
  C(19, "JUMPulseFan", null, "The JUM Pulse world meter is going crazy right now 😱", "60'", 66),
  C(20, "LateKickoff", null, "Just tuned in — what did I miss?", "59'", 23, [
    R(33, "Emre53", "Top Fan", "Two Icardi goals, one Dzeko strike. Watch the replay asap", "58'", 35),
  ]),
];
