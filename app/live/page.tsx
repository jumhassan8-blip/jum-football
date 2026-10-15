"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, PauseCircle, Play, RefreshCw, Share2, Whistle } from "lucide-react";
import { LEAGUES_ALL, type LiveMatch } from "@/lib/leaguesData";
import { isDev, devBoardMatches } from "@/lib/devBoard";
import AdSlot from "@/components/AdSlot";
import BottomNav from "@/components/BottomNav";
import { useT } from "@/lib/i18n";
import TeamLogo from "@/components/TeamLogo";
import WatchGate from "@/components/WatchGate";
import { useViewerCounts } from "@/lib/presence";

const AFCON = "AFCON";

/** Client route id for a real fixture — matches the /match/1{last5} deep link. */
const fixtureRouteId = (fixtureId: number) => `1${String(fixtureId).slice(-5)}`;

/** Viewer badge — count from the aggregate doc; honest "be the first" at 0. */
function ViewerChip({ n }: { n: number }) {
  const t = useT();
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ring-1 ${
        n > 0
          ? "bg-accent/15 text-accent ring-accent/30"
          : "bg-white/5 text-dim ring-white/10"
      }`}
    >
      👁 {n > 0 ? t("live.watchingCount", { count: n }) : t("live.beFirst")}
    </span>
  );
}

/* ── real API fixture types (api-sports shape) ── */
type ApiTeam = { id: number; name: string; logo: string };
type ApiFixture = {
  fixture: { id: number; date?: string; status: { short: string; elapsed: number | null } };
  league: { id: number; name: string; logo: string; country?: string };
  teams: { home: ApiTeam; away: ApiTeam };
  goals: { home: number | null; away: number | null };
};
type ApiResponse = {
  fixtures: ApiFixture[];
  source: "live" | "fallback";
  lastUpdated: string;
  stale: boolean;
  quotaGuarded: boolean;
};
type GroupResponse = {
  group: string;
  live: ApiFixture[];
  next: ApiFixture[];
  leagueNames: Record<number, string>;
  lastUpdated: string;
  stale: boolean;
  quotaGuarded: boolean;
};

type GoalFlash = { id: number; team: string; score: string } | null;

async function shareMatch(t: (k: string, v?: Record<string, string | number>) => string, f: {
  home: string; away: string; score: string; minute: number;
}) {
  const text = t("live.shareText", {
    home: f.home, away: f.away, score: f.score, minute: f.minute,
  });
  const url = window.location.origin + `/live/`;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "JUM Football", text, url });
      return;
    } catch {
      return; // dismissed
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
  } catch {
    /* clipboard unavailable */
  }
}

/** Labeled illustrative row (§4) — only ever rendered in development. */
function DevCard({ match, index, viewers }: { match: LiveMatch; index: number; viewers: number }) {
  return <LiveCardShell match={match} index={index} viewers={viewers} />;
}

function statusLabel(f: ApiFixture): { text: string; live: boolean } {
  const short = f.fixture.status.short;
  const elapsed = f.fixture.status.elapsed;
  if (short === "HT") return { text: "HT", live: false };
  if (short === "FT") return { text: "FT", live: false };
  if (short === "NS") return { text: "", live: false };
  return { text: `${elapsed ?? 0}′`, live: true };
}

function fixtureScore(f: ApiFixture): string {
  return f.goals.home == null || f.goals.away == null
    ? "vs"
    : `${f.goals.home} - ${f.goals.away}`;
}

type CardProps = { f: ApiFixture; index: number; flash: "home" | "away" | null; viewers: number };

/** Real-fixture card — crests via TeamLogo; memoized so unchanged rows skip re-render. */
const ApiCard = memo(function ApiCard({ f, index, flash, viewers }: CardProps) {
  const t = useT();
  const router = useRouter();
  const s = statusLabel(f);
  const score = fixtureScore(f);
  const minute = f.fixture.status.elapsed ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index, 8) * 0.05 }}
      className="w-full rounded-card bg-card p-3.5 text-left ring-1 ring-white/[0.05] transition hover:ring-accent/30"
    >
      <div className="flex items-center gap-2">
        {s.live ? (
          <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-black text-bg">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-bg" />
            {s.text}
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-dim">
            {f.fixture.status.short === "NS"
              ? t("live.todayRow", { time: "" }).split("·")[0].trim() || "TODAY"
              : s.text}
          </span>
        )}
        <ViewerChip n={viewers} />
        <button
          onClick={() =>
            void shareMatch(t, { home: f.teams.home.name, away: f.teams.away.name, score, minute })
          }
          aria-label={t("a11y.share")}
          className="ms-auto flex h-7 w-7 items-center justify-center rounded-full text-dim transition hover:bg-white/5 hover:text-accent"
        >
          <Share2 size={13} />
        </button>
      </div>
      <button
        onClick={() => {
          window.sessionStorage.setItem("jum-live-scroll", String(window.scrollY));
          router.push(`/match/${fixtureRouteId(f.fixture.id)}/`);
        }}
        className="mt-2.5 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo team={f.teams.home} size={32} />
          <span className="truncate text-[14px] font-bold">{f.teams.home.name}</span>
        </div>
        <span
          className={`rounded-lg bg-accent px-3 py-1 text-[15px] font-black tabular-nums text-bg ${
            flash === "home" ? "goal-flash" : ""
          }`}
        >
          {score}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-[14px] font-bold">{f.teams.away.name}</span>
          <span className={flash === "away" ? "goal-flash rounded-full" : ""}>
            <TeamLogo team={f.teams.away} size={32} />
          </span>
        </div>
      </button>
      <WatchGate
        home={f.teams.home.name}
        away={f.teams.away.name}
        onWatch={() => {
          window.sessionStorage.setItem("jum-live-scroll", String(window.scrollY));
          router.push(`/match/${fixtureRouteId(f.fixture.id)}/`);
        }}
        className="mt-3 block cursor-pointer"
      >
        <span className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-accent text-[12px] font-black text-bg">
          <Play size={13} fill="currentColor" />
          {t("live.watchLive")}
        </span>
      </WatchGate>
    </motion.div>
  );
}, (a, b) =>
  a.f.fixture.id === b.f.fixture.id &&
  a.f.fixture.status.short === b.f.fixture.status.short &&
  a.f.fixture.status.elapsed === b.f.fixture.status.elapsed &&
  a.f.goals.home === b.f.goals.home &&
  a.f.goals.away === b.f.goals.away &&
  a.f.teams.home.name === b.f.teams.home.name &&
  a.f.teams.away.name === b.f.teams.away.name &&
  a.flash === b.flash &&
  a.viewers === b.viewers
);

/** Upcoming (not-started) fixture row — used for "Next: AFCON qualifiers". */
function NextCard({ f, index }: { f: ApiFixture; index: number }) {
  const t = useT();
  const d = f.fixture.date ? new Date(f.fixture.date) : null;
  const when = d
    ? d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index, 8) * 0.04 }}
      className="flex items-center gap-2.5 rounded-card bg-card p-3 ring-1 ring-white/[0.05]"
    >
      <TeamLogo team={f.teams.home} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold">
          {f.teams.home.name} vs {f.teams.away.name}
        </p>
        <p className="text-[10px] font-bold text-dim">
          {f.league.name} · {when || t("live.todayRow", { time: "" })}
        </p>
      </div>
      <TeamLogo team={f.teams.away} size={28} />
    </motion.div>
  );
}

/** Mock card shell (kept for fallback mode and the watch room). */
function LiveCardShell({ match, index, viewers }: { match: LiveMatch; index: number; viewers: number }) {
  const router = useRouter();
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.06 }}
      className="w-full rounded-card bg-card p-3.5 text-left ring-1 ring-white/[0.05] transition hover:ring-accent/30"
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-black text-bg">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-bg" />
          {match.minute}&prime;
        </span>
        {match.scorers && <span className="truncate text-[10px] text-dim">{match.scorers}</span>}
        <ViewerChip n={viewers} />
        <button
          onClick={() =>
            void shareMatch(t, {
              home: match.home, away: match.away, score: match.score, minute: match.minute,
            })
          }
          aria-label={t("a11y.share")}
          className="ms-auto flex h-7 w-7 items-center justify-center rounded-full text-dim transition hover:bg-white/5 hover:text-accent"
        >
          <Share2 size={13} />
        </button>
      </div>
      <button
        onClick={() => {
          window.sessionStorage.setItem("jum-live-scroll", String(window.scrollY));
          router.push(`/match/${match.id}/`);
        }}
        className="mt-2.5 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo team={{ name: match.home, logo: match.homeLogo }} size={32} />
          <span className="truncate text-[14px] font-bold">{match.home}</span>
        </div>
        <span className="rounded-lg bg-accent px-3 py-1 text-[15px] font-black tabular-nums text-bg">
          {match.score}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-[14px] font-bold">{match.away}</span>
          <TeamLogo team={{ name: match.away, logo: match.awayLogo }} size={32} />
        </div>
      </button>
      <WatchGate
        home={match.home}
        away={match.away}
        onWatch={() => {
          window.sessionStorage.setItem("jum-live-scroll", String(window.scrollY));
          router.push(`/live/watch/${match.id}/`);
        }}
        className="mt-3 block cursor-pointer"
      >
        <span
          aria-label={`Open watch room for ${match.home} vs ${match.away}`}
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-accent text-[12px] font-black text-bg"
        >
          <Play size={13} fill="currentColor" />
          {t("live.watchLive")}
        </span>
      </WatchGate>
    </motion.div>
  );
}

function Skeleton({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <main className="mx-auto max-w-[430px] space-y-3 px-4 pt-3" aria-label={t("live.loading")}>
      <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
      <div className="h-32 animate-pulse rounded-card bg-white/5" />
      <div className="h-32 animate-pulse rounded-card bg-white/5" />
      <div className="h-32 animate-pulse rounded-card bg-white/5" />
    </main>
  );
}

export default function LivePage() {
  const t = useT();
  const [activeLeague, setActiveLeague] = useState<string>("All");
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [api, setApi] = useState<ApiResponse | null>(null);
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [goalToast, setGoalToast] = useState<GoalFlash>(null);
  const prevGoals = useRef<Map<number, { home: number | null; away: number | null }>>(new Map());
  const [flashKey, setFlashKey] = useState<{ id: number; side: "home" | "away"; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── offline/recovery state (sticky-offline fix) ──
     A healthy poll MUST clear offline+stale unconditionally; failures retry
     with 5s → 15s → 30s backoff and the banner appears only after 3
     consecutive failures. */
  const BACKOFF_MS = [5_000, 15_000, 30_000] as const;
  const failCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchEpoch = useRef(0);
  const attemptCount = useRef(0);
  const backToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [offline, setOffline] = useState(false);
  const [stale, setStale] = useState(false);
  const [backToast, setBackToast] = useState(false);

  /* poll target: AFCON confederation group or the default live board */
  const isAfcon = activeLeague === AFCON;

  const fetchLive = useCallback(async () => {
    attemptCount.current += 1;
    const n = attemptCount.current;
    const myEpoch = ++fetchEpoch.current;
    try {
      const res = await fetch(isAfcon ? "/api/live?group=afcon" : "/api/live", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse & GroupResponse;
      // eslint-disable-next-line no-console
      console.log(`[poll] #${n} ok`);
      if (myEpoch !== fetchEpoch.current) return; // superseded by a newer attempt
      if (isAfcon) setGroup(json);
      else setApi(json as ApiResponse);
      /* §1: success clears offline/stale UNCONDITIONALLY — the fresh payload
         is stored even when deep-identical, so neither flag can stick. */
      const wasFailing = failCount.current > 0;
      failCount.current = 0;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      setOffline(false);
      setStale(Boolean(json.stale));
      if (wasFailing) {
        /* §3: quiet recovery toast — banner already cleared above */
        setBackToast(true);
        if (backToastTimer.current) clearTimeout(backToastTimer.current);
        backToastTimer.current = setTimeout(() => setBackToast(false), 2500);
      }
    } catch {
      // eslint-disable-next-line no-console
      console.log(`[poll] #${n} fail (${failCount.current + 1} in a row)`);
      if (myEpoch !== fetchEpoch.current) return;
      failCount.current += 1;
      /* §2: banner only after 3 consecutive failures, never on the first */
      if (failCount.current >= 3) setOffline(true);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      const wait = BACKOFF_MS[Math.min(failCount.current, BACKOFF_MS.length) - 1];
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        void fetchRef.current();
      }, wait);
    }
  }, [isAfcon]);

  /* goal detection: diff goals per fixture id between polls → toast + flash */
  const detectGoals = useCallback((fixtures: ApiFixture[]) => {
    for (const f of fixtures) {
      const prev = prevGoals.current.get(f.fixture.id);
      const h = f.goals.home ?? 0;
      const a = f.goals.away ?? 0;
      if (prev && (prev.home !== f.goals.home || prev.away !== f.goals.away)) {
        const side: "home" | "away" =
          (f.goals.home ?? 0) > (prev.home ?? 0) ? "home" : "away";
        const team = side === "home" ? f.teams.home.name : f.teams.away.name;
        const ev = { id: Date.now() + f.fixture.id, team, score: `${h} - ${a}` };
        setGoalToast(ev);
        setFlashKey({ id: f.fixture.id, side, at: Date.now() });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setGoalToast(null), 4500);
        setTimeout(() => setFlashKey((k) => (k && k.id === f.fixture.id ? null : k)), 3000);
      }
      prevGoals.current.set(f.fixture.id, { home: f.goals.home, away: f.goals.away });
    }
  }, []);

  /* latest fetchLive, so the mount-once effect below never goes stale */
  const fetchRef = useRef(fetchLive);
  fetchRef.current = fetchLive;
  const pollCount = useRef(0);

  /* back-navigation restore + first fetch + 60s poll (proxy cache ≥120s) — mounts ONCE */
  useEffect(() => {
    const savedFilter = window.sessionStorage.getItem("jum-live-filter");
    if (savedFilter) setActiveLeague(savedFilter);
    setReady(true);
    void fetchRef.current();
    const savedScroll = Number(window.sessionStorage.getItem("jum-live-scroll") ?? 0);
    if (savedScroll) {
      requestAnimationFrame(() => window.scrollTo(0, savedScroll));
    }
    const poll = () => {
      pollCount.current += 1;
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(`[live] poll #${pollCount.current} ${new Date().toISOString()}`);
      }
      void fetchRef.current();
    };
    timer.current = setInterval(poll, 60_000);
    // §5: pause polling while the tab is hidden — no wasted /api calls.
    // The guard (timer.current === null) makes resume idempotent, so a
    // tab hide→show cycle can never kill the interval permanently.
    const onVis = () => {
      if (document.hidden) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        if (retryTimer.current) {
          clearTimeout(retryTimer.current);
          retryTimer.current = null;
        }
      } else if (!timer.current) {
        poll();
        timer.current = setInterval(poll, 60_000);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (timer.current) clearInterval(timer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  /* refetch exactly once whenever the user switches the chip (All ↔ AFCON);
     skip the initial run (mount effect already fetches) */
  const chipEffectRan = useRef(false);
  useEffect(() => {
    if (!chipEffectRan.current) {
      chipEffectRan.current = true;
      return;
    }
    void fetchLive();
  }, [isAfcon, fetchLive]);

  useEffect(() => {
    if (ready) window.sessionStorage.setItem("jum-live-filter", activeLeague);
  }, [activeLeague, ready]);

  /* run goal detection whenever fresh fixtures land */
  useEffect(() => {
    if (isAfcon) {
      if (group?.live) detectGoals(group.live);
    } else if (api?.fixtures) {
      detectGoals(api.fixtures);
    }
  }, [api, group, isAfcon, detectGoals]);

  // §4: production shows REAL data or an honest empty state — fabricated
  // fixtures render ONLY behind NODE_ENV=development (illustrative dev data).
  const liveFixtures = isAfcon ? (group?.live ?? []) : (api?.fixtures ?? []);
  const nextFixtures = isAfcon ? (group?.next ?? []) : [];
  const showDevBoard =
    !isAfcon && isDev() && (!api || ((api.source !== "live" || liveFixtures.length === 0) && !api.stale));
  const devMatches = useMemo<LiveMatch[]>(() => (isDev() ? devBoardMatches() : []), []);

  const refreshNow = async () => {
    setRefreshing(true);
    await fetchLive();
    setTimeout(() => setRefreshing(false), 700);
  };

  const data = isAfcon ? group : api;
  // freshness in seconds — a 60s poll against the 120s live cache TTL
  // must visibly age, not snap to "0 min" for two straight polls
  const secsAgo = data
    ? Math.max(0, Math.round((Date.now() - new Date(data.lastUpdated).getTime()) / 1000))
    : 0;
  const minsAgo = Math.floor(secsAgo / 60);

  // 1s ticker so the "Updated Xs ago" label ages visibly between 60s polls
  const [, setFreshTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setFreshTick((n) => n + 1), 1_000);
    return () => clearInterval(iv);
  }, []);

  const leagueGroups = useMemo(() => {
    const map = new Map<string, ApiFixture[]>();
    for (const f of liveFixtures) {
      const key = f.league.name;
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return [...map.entries()];
  }, [liveFixtures]);

  const nextGroups = useMemo(() => {
    const map = new Map<string, ApiFixture[]>();
    for (const f of nextFixtures) {
      const key = f.league.name;
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return [...map.entries()];
  }, [nextFixtures]);

  /* live viewer counts — one lightweight aggregate doc per visible match */
  const visibleMatchIds = useMemo(() => {
    const ids: string[] = [];
    for (const [name, items] of leagueGroups) {
      if (activeLeague !== "All" && name !== activeLeague) continue;
      for (const f of items) ids.push(fixtureRouteId(f.fixture.id));
    }
    if (showDevBoard) for (const m of devMatches) ids.push(String(m.id));
    return ids;
  }, [leagueGroups, activeLeague, showDevBoard, devMatches]);
  const viewerCounts = useViewerCounts(visibleMatchIds);

  return (
    <div className="min-h-screen bg-bg pb-24 text-white">
      {/* header */}
      <header className="glass-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-[430px] items-center gap-2 px-4 py-3">
          <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-accent" />
          <h1 className="text-[17px] font-black tracking-tight">{t("nav.live").toUpperCase()}</h1>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-black text-bg">
            {t("live.matchesLive", { count: liveFixtures.length })}
          </span>
          <Link href="/match/" className="ms-auto text-[11px] font-bold text-dim hover:text-accent">
            {t("common.viewAll")} →
          </Link>
        </div>
        <div className="no-scrollbar mx-auto flex max-w-[430px] gap-1.5 overflow-x-auto px-4 pb-3">
          {[
            { id: -1, name: "All", flag: "🌍" },
            { id: -2, name: AFCON, flag: "🇿🇦" },
            ...LEAGUES_ALL,
          ].map((l) => {
            const active = activeLeague === l.name;
            return (
              <button
                key={l.id}
                onClick={() => setActiveLeague(l.name)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                  active ? "bg-accent text-bg" : "bg-card text-dim ring-1 ring-divider hover:text-white"
                }`}
              >
                <span>{l.flag}</span>
                {l.name === AFCON ? t("live.afconChip") : l.name}
              </button>
            );
          })}
        </div>
      </header>

      <AdSlot pos="top" />

      {/* status banners */}
      {data?.quotaGuarded && (
        <div className="mx-auto mt-2 flex max-w-[430px] items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-[11px] font-bold text-yellow-400 ring-1 ring-yellow-500/30">
          <PauseCircle size={14} className="shrink-0" />
          {t("live.quotaBanner")}
        </div>
      )}
      {(offline || stale) && (
        <div className="mx-auto mt-2 flex max-w-[430px] items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] font-bold text-dim ring-1 ring-divider" data-testid="offline-banner">
          <CloudOff size={14} className="shrink-0" />
          {t("live.staleBanner")}
        </div>
      )}

      {/* goal toast */}
      <AnimatePresence>
        {goalToast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-16 z-[70] -translate-x-1/2 rounded-full bg-accent px-4 py-2 text-[13px] font-black text-bg shadow-lg shadow-accent/30"
          >
            ⚽ {t("live.goal", { team: goalToast.team, score: goalToast.score })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* quiet "back online" recovery toast */}
      <AnimatePresence>
        {backToast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed left-1/2 top-24 z-[70] -translate-x-1/2 rounded-full bg-accent px-3 py-1.5 text-[11px] font-black text-bg shadow-lg shadow-accent/20"
          >
            {t("live.backOnline")}
          </motion.div>
        )}
      </AnimatePresence>

      {!ready || (!data && !showDevBoard) ? (
        <Skeleton t={t} />
      ) : liveFixtures.length > 0 ? (
        <>
          <p className="mx-auto max-w-[430px] px-4 pt-2 text-[10px] font-bold text-dim/70">
            {secsAgo < 45
              ? t("live.updatedJustNow")
              : minsAgo < 1
                ? t("live.updatedSecondsAgo", { sec: secsAgo })
                : t("live.updatedAgo", { min: minsAgo })}
            {!isAfcon && api?.source === "fallback"
              ? ` · ${t("live.todayRow", { time: "" }).split("·")[0].trim()}`
              : ""}
          </p>
          <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-2">
            <AnimatePresence mode="popLayout">
              {leagueGroups
                .filter(([name]) => activeLeague === "All" || name === activeLeague)
                .map(([name, items], gi) => (
                  <motion.section
                    key={name}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <TeamLogo
                        team={{ name, logo: items[0]?.league.logo ?? "" }}
                        size={20}
                      />
                      <h2 className="text-[13px] font-extrabold">{name}</h2>
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-black text-accent">
                        {t("live.matchesLive", { count: items.length })}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {items.map((f, i) => (
                        <ApiCard
                          key={f.fixture.id}
                          f={f}
                          index={i}
                          flash={flashKey && flashKey.id === f.fixture.id ? flashKey.side : null}
                          viewers={viewerCounts[fixtureRouteId(f.fixture.id)] ?? 0}
                        />
                      ))}
                    </div>
                    {gi === 0 && (
                      <div className="pt-3">
                        <AdSlot pos="infeed" />
                      </div>
                    )}
                  </motion.section>
                ))}
              {leagueGroups.filter(([name]) => activeLeague === "All" || name === activeLeague).length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-16"
                >
                  <Whistle size={36} className="text-dim/50" />
                  <p className="text-center text-[13px] text-dim">{t("live.noMatchesRightNow")}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AFCON: upcoming qualifiers when nothing (or below the live list) */}
            {isAfcon && nextGroups.length > 0 && (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[15px]">🗓️</span>
                  <h2 className="text-[13px] font-extrabold">{t("live.nextAfcon")}</h2>
                </div>
                <div className="space-y-2.5">
                  {nextGroups.slice(0, 2).flatMap(([, items]) =>
                    items.slice(0, 4).map((f, i) => <NextCard key={f.fixture.id} f={f} index={i} />)
                  )}
                </div>
              </section>
            )}
          </main>
        </>
      ) : isAfcon ? (
        /* AFCON quiet right now → show upcoming qualifiers */
        <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-3">
          <div className="flex flex-col items-center gap-3 py-8">
            <Whistle size={36} className="text-dim/50" />
            <p className="text-center text-[13px] text-dim">{t("live.noMatchesRightNow")}</p>
          </div>
          {nextGroups.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[15px]">🗓️</span>
                <h2 className="text-[13px] font-extrabold">{t("live.nextAfcon")}</h2>
              </div>
              <div className="space-y-2.5">
                {nextGroups.slice(0, 3).flatMap(([, items]) =>
                  items.slice(0, 4).map((f, i) => <NextCard key={f.fixture.id} f={f} index={i} />)
                )}
              </div>
            </section>
          )}
        </main>
      ) : isDev() ? (
        /* dev only: quiet API → illustrative board (never in production) */
        <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-dim">
              DEV · illustrative
            </span>
          </div>
          {devMatches.map((m, i) => (
            <DevCard
              key={m.id}
              match={{ ...m, minute: Math.min(90, m.minute + 1) }}
              index={i}
              viewers={viewerCounts[String(m.id)] ?? 0}
            />
          ))}
        </main>
      ) : (
        /* §4 production: quiet API → honest empty state, never fabricated */
        <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-3">
          <div className="flex flex-col items-center gap-3 py-16">
            <Whistle size={36} className="text-dim/50" />
            <p className="text-center text-[13px] text-dim">{t("live.noMatchesRightNow")}</p>
            {api?.stale && (
              <p className="text-center text-[11px] text-dim/60">{t("live.offlineNote")}</p>
            )}
          </div>
        </main>
      )}

      {/* refresh FAB */}
      <button
        onClick={refreshNow}
        aria-label={t("live.refresh")}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-bg shadow-lg shadow-black/40 transition-transform active:scale-95"
      >
        <RefreshCw size={20} className={refreshing ? "refreshing" : ""} />
      </button>

      {/* reserved space for the fixed sticky ad — no content overlap */}
      <div className="h-[50px]" aria-hidden />
      <AdSlot pos="mobileSticky" />
      <BottomNav />
    </div>
  );
}
