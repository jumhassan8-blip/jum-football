"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AdSlot from "@/components/AdSlot";
import TeamLogo from "@/components/TeamLogo";
import { useT } from "@/lib/i18n";
import { findTeamByName, TEAMS_STATS, type TeamStats } from "@/lib/fanintel";
import { trackEvent } from "@/lib/analytics";

type PressureRow = {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  minute: number | null;
  score: string;
  possessionHome: number;
  shotsH: number;
  shotsA: number;
  cornersH: number;
  cornersA: number;
  fouls: number;
  dangerousAttacks: number;
  refereeName: string | null;
  momentumPct: number;
  status: string;
};

type FixtureLite = {
  fixture: { id: number; timestamp: number; date?: string; status: { short: string } };
  teams: { home: { name: string }; away: { name: string } };
};

type TeamStatsPayload = { teams?: TeamStats[] };

const REFRESH_MS = 60_000;
const matchUrl = (fixtureId: number) => `/match/1${String(fixtureId).slice(-5)}/`;

function PossessionBar({ home }: { home: number }) {
  const h = Math.max(0, Math.min(100, home));
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full bg-accent transition-all duration-700"
        style={{ width: `${h}%` }}
      />
      <div className="h-full flex-1 bg-[#FF4D4D]/80 transition-all duration-700" />
    </div>
  );
}

function formatCountdown(ts: number, nowMs: number): string {
  const diff = ts * 1000 - nowMs;
  if (diff <= 0) return "0m";
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export default function PressurePage() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<"live" | "today" | "attack">("live");
  const [rows, setRows] = useState<PressureRow[] | null>(null); // null = loading
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [tick, setTick] = useState(0); // re-renders the "Xs ago" label
  const [todayFixtures, setTodayFixtures] = useState<FixtureLite[] | null>(null);
  const [teams, setTeams] = useState<TeamStats[]>(TEAMS_STATS);
  const dominatedRef = useRef<Set<number>>(new Set());

  // "Updated Xs ago" clock
  useEffect(() => {
    const i = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const fetchLive = useCallback(() => {
    fetch("/api/live-stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { rows: [], stale: true }))
      .then((json: { rows?: PressureRow[]; stale?: boolean }) => {
        setRows(json.rows ?? []);
        setStale(!!json.stale);
        setUpdatedAt(Date.now());
      })
      .catch(() => {
        setRows((prev) => prev ?? []);
        setStale(true);
      });
  }, []);

  useEffect(() => {
    fetchLive();
    let i: ReturnType<typeof setInterval> | null = setInterval(fetchLive, REFRESH_MS);
    // §5: pause polling while the tab is hidden
    const onVis = () => {
      if (document.hidden) {
        if (i) clearInterval(i);
        i = null;
      } else if (!i) {
        void fetchLive();
        i = setInterval(fetchLive, REFRESH_MS);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (i) clearInterval(i);
    };
  }, [fetchLive]);

  useEffect(() => {
    trackEvent("pressure_viewed");
    // Today's fixtures come from the SAME shared /api/live cache — no extra upstream
    fetch("/api/live", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { fixtures: [] }))
      .then((json: { fixtures?: FixtureLite[] }) =>
        setTodayFixtures(json.fixtures ?? [])
      )
      .catch(() => setTodayFixtures([]));
    fetch("/api/team-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: TeamStatsPayload | null) => {
        if (json?.teams?.length) setTeams(json.teams);
      })
      .catch(() => {});
  }, []);

  // DOMINATING badge analytics — once per fixture per session
  useEffect(() => {
    if (!rows) return;
    for (const r of rows) {
      const homeDom = r.possessionHome > 60 && r.momentumPct > 70;
      const awayDom = 100 - r.possessionHome > 60 && 100 - r.momentumPct > 70;
      if ((homeDom || awayDom) && !dominatedRef.current.has(r.fixtureId)) {
        dominatedRef.current.add(r.fixtureId);
        trackEvent("dominating_badge_shown", { fixture: r.fixtureId });
      }
    }
  }, [rows]);

  const ago = updatedAt ? Math.max(0, Math.floor((Date.now() - updatedAt) / 1000)) : null;
  void tick; // the label recomputes on each 1s tick

  const attackRanked = [...teams].sort((a, b) => b.avgShots - a.avgShots);
  const maxShots = attackRanked[0]?.avgShots ?? 1;

  const dominating = (r: PressureRow) =>
    (r.possessionHome > 60 && r.momentumPct > 70) ||
    (100 - r.possessionHome > 60 && 100 - r.momentumPct > 70);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <AdSlot pos="top" />

      <main className="mx-auto max-w-lg lg:max-w-3xl">
        <div className="flex items-center gap-2 px-4 pt-4">
          <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-[#FF4D4D]" />
          <h1 className="text-[17px] font-extrabold">{t("fanintel.pressure.title")}</h1>
        </div>
        <p className="px-4 pt-1 text-[12px] text-dim">{t("fanintel.pressure.subtitle")}</p>
        <p className="px-4 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-dim/60">
          {ago != null
            ? t("fanintel.pressure.updatedAgo", { s: ago })
            : t("common.loading")}
        </p>

        {stale && (
          <div className="mx-4 mt-3 rounded-card bg-[#FF4D4D]/10 p-3 text-center ring-1 ring-[#FF4D4D]/30">
            <p className="text-[11px] font-bold text-[#FF4D4D]">
              {t("fanintel.pressure.stale")}
            </p>
          </div>
        )}

        {/* tabs */}
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-4">
          {(
            [
              ["live", t("fanintel.pressure.liveNow")],
              ["today", t("fanintel.pressure.today")],
              ["attack", t("fanintel.pressure.mostAttacking")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`min-h-[36px] shrink-0 rounded-full px-4 text-[12px] font-bold transition-colors ${
                tab === key
                  ? "bg-accent text-bg"
                  : "bg-card text-dim ring-1 ring-divider hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── LIVE TAB ── */}
        {tab === "live" && (
          <div className="pt-3">
            {rows === null && (
              <div className="space-y-2 px-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-card bg-card" />
                ))}
              </div>
            )}
            {rows !== null && rows.length === 0 && (
              <div className="mx-4 rounded-card bg-card p-8 text-center ring-1 ring-divider">
                <p className="text-[13px] font-bold text-dim">
                  {t("fanintel.pressure.empty")}
                </p>
              </div>
            )}

            {rows !== null && rows.length > 0 && (
              <>
                {/* desktop table ≥768px */}
                <div className="hidden overflow-hidden rounded-card bg-card ring-1 ring-divider md:mx-4 md:block">
                  <div className="grid grid-cols-[36px_minmax(0,1.4fr)_56px_minmax(0,1.6fr)_70px_90px_64px_76px_88px] items-center gap-x-2 border-b border-divider px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-dim">
                    <span>{t("common.minuteShort")}</span>
                    <span>{t("fanintel.pressure.col.match")}</span>
                    <span />
                    <span>{t("fanintel.pressure.col.possession")}</span>
                    <span>{t("fanintel.pressure.col.shots")}</span>
                    <span>{t("fanintel.pressure.col.attacks")}</span>
                    <span>{t("fanintel.pressure.col.corners")}</span>
                    <span>{t("fanintel.pressure.col.momentum")}</span>
                    <span />
                  </div>
                  {rows.map((r) => (
                    <button
                      key={r.fixtureId}
                      onClick={() => router.push(matchUrl(r.fixtureId))}
                      className="grid w-full grid-cols-[36px_minmax(0,1.4fr)_56px_minmax(0,1.6fr)_70px_90px_64px_76px_88px] items-center gap-x-2 border-b border-divider px-3 py-2.5 text-left last:border-0 hover:bg-white/[0.03]"
                    >
                      <span className="text-[11px] font-black text-accent">
                        {r.minute != null ? `${r.minute}'` : "–"}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <TeamLogo team={r.homeTeam} size={24} />
                        <span className="truncate text-[11px] font-bold text-white">
                          {r.homeTeam} – {r.awayTeam}
                        </span>
                      </span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-center text-[10px] font-black text-white ring-1 ring-divider">
                        {r.score}
                      </span>
                      <span className="pr-1">
                        <PossessionBar home={r.possessionHome} />
                      </span>
                      <span className="text-[11px] font-bold text-white">
                        {r.shotsH}–{r.shotsA}
                      </span>
                      <span className="text-[11px] font-bold text-white">{r.dangerousAttacks}</span>
                      <span className="text-[11px] font-bold text-white">{r.cornersH + r.cornersA}</span>
                      <span className="text-[11px] font-black text-accent">{r.momentumPct}%</span>
                      {dominating(r) && (
                        <span className="pulse-dot flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-accent">
                          {t("fanintel.pressure.dominating")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* mobile stacked cards */}
                <div className="space-y-2 px-4 md:hidden">
                  {rows.map((r) => (
                    <button
                      key={r.fixtureId}
                      onClick={() => router.push(matchUrl(r.fixtureId))}
                      className="block w-full rounded-card bg-card p-3 text-left ring-1 ring-divider active:ring-accent/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <TeamLogo team={r.homeTeam} size={24} />
                          <span className="truncate text-[12px] font-extrabold text-white">
                            {r.homeTeam} – {r.awayTeam}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black text-white ring-1 ring-divider">
                            {r.score}
                          </span>
                          <span className="text-[11px] font-black text-accent">
                            {r.minute != null ? `${r.minute}'` : ""}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <PossessionBar home={r.possessionHome} />
                        <div className="mt-1 flex justify-between text-[9px] font-bold text-dim">
                          <span>{r.possessionHome}%</span>
                          <span>{100 - r.possessionHome}%</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-dim">
                        <span>
                          {t("fanintel.pressure.col.shots")} {r.shotsH}–{r.shotsA}
                        </span>
                        <span>
                          {t("fanintel.pressure.col.attacks")} {r.dangerousAttacks}
                        </span>
                        <span>
                          {t("fanintel.pressure.col.corners")} {r.cornersH + r.cornersA}
                        </span>
                        <span className="font-black text-accent">
                          {t("fanintel.pressure.col.momentum")} {r.momentumPct}%
                        </span>
                      </div>
                      {dominating(r) && (
                        <span className="pulse-dot mt-2 flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-accent">
                          {t("fanintel.pressure.dominating")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TODAY TAB ── */}
        {tab === "today" && (
          <div className="space-y-2 px-4 pt-3">
            {todayFixtures === null && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-card bg-card" />
                ))}
              </div>
            )}
            {todayFixtures !== null && todayFixtures.length === 0 && (
              <div className="rounded-card bg-card p-8 text-center ring-1 ring-divider">
                <p className="text-[13px] font-bold text-dim">
                  {t("fanintel.pressure.empty")}
                </p>
              </div>
            )}
            {todayFixtures?.map((f) => {
              const home = findTeamByName(f.teams.home.name);
              const away = findTeamByName(f.teams.away.name);
              const possH = home?.avgPossession ?? 50;
              const possA = away?.avgPossession ?? 50;
              const sum = possH + possA || 100;
              return (
                <button
                  key={f.fixture.id}
                  onClick={() => router.push(matchUrl(f.fixture.id))}
                  className="block w-full rounded-card bg-card p-3 text-left ring-1 ring-divider active:ring-accent/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <TeamLogo team={f.teams.home.name} size={24} />
                      <span className="truncate text-[12px] font-extrabold text-white">
                        {f.teams.home.name} {t("fanintel.pressure.vs")} {f.teams.away.name}
                      </span>
                      <TeamLogo team={f.teams.away.name} size={24} />
                    </span>
                    <span className="shrink-0 text-[10px] font-black text-accent">
                      {t("fanintel.pressure.kickoffIn", {
                        time: formatCountdown(f.fixture.timestamp, Date.now()),
                      })}
                    </span>
                  </div>
                  <p className="pt-2 text-[9px] font-bold uppercase tracking-wider text-dim/70">
                    {t("fanintel.pressure.seasonAvg")}
                  </p>
                  <div className="mt-1">
                    <PossessionBar home={Math.round((possH / sum) * 100)} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── MOST ATTACKING TAB ── */}
        {tab === "attack" && (
          <div className="space-y-2 px-4 pt-3">
            {attackRanked.map((tm, i) => (
              <div key={tm.teamId} className="flex items-center gap-3 rounded-card bg-card p-3 ring-1 ring-divider">
                <span className="w-5 text-center text-[12px] font-black text-dim">{i + 1}</span>
                <TeamLogo team={tm.logo || tm.teamName} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-extrabold text-white">{tm.teamName}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(tm.avgShots / maxShots) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold text-dim">
                  {t("fanintel.pressure.avgShots", { n: tm.avgShots.toFixed(1) })}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      <AdSlot pos="infeed" />
      {/* reserved space for the fixed sticky ad — no content overlap */}
      <div className="h-[50px]" aria-hidden />
      <AdSlot pos="mobileSticky" />
      <BottomNav />
    </div>
  );
}
