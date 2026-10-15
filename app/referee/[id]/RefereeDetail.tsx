"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AdBanner from "@/components/AdBanner";
import AdSlot from "@/components/AdSlot";
import TeamLogo from "@/components/TeamLogo";
import { useT } from "@/lib/i18n";
import {
  fairnessBand,
  insightFor,
  leagueAverages,
  refInitials,
  findRefByName,
  type Referee,
} from "@/lib/fanintel";
import { trackEvent } from "@/lib/analytics";

type LiveStatsRow = {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  minute: number | null;
  score: string;
  refereeName: string | null;
};

const matchUrl = (fixtureId: number) => `/match/1${String(fixtureId).slice(-5)}/`;

const BAND_CLASS: Record<string, string> = {
  favorite: "bg-accent text-bg",
  balanced: "bg-white/10 text-white ring-1 ring-divider",
  strict: "bg-[#FF4D4D] text-white",
};

export default function RefereeDetail({ refData }: { refData: Referee }) {
  const t = useT();
  const [liveRow, setLiveRow] = useState<LiveStatsRow | null>(null);

  useEffect(() => {
    trackEvent("referee_viewed", { ref_id: refData.id });
  }, [refData.id]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/live-stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((json: { rows?: LiveStatsRow[] }) => {
        if (cancelled) return;
        const mine = (json.rows ?? []).find(
          (row) => findRefByName(row.refereeName)?.id === refData.id
        );
        if (mine) setLiveRow(mine);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refData.id]);

  const band = fairnessBand(refData.fairnessScore);
  const avgs = useMemo(() => leagueAverages(refData.league), [refData.league]);

  const cardsData = refData.cardsLast10.map((cards, i) => ({
    game: `${t("fanintel.cardsChart").split(" ")[0]} ${i + 1}`,
    cards,
  }));
  const winData = [
    { name: "home", pct: refData.homeWinPct },
    { name: "away", pct: Math.max(0, 100 - refData.homeWinPct - 26) },
    { name: "draw", pct: 26 },
  ];

  const TrendIcon =
    refData.trend === "up" ? (
      <TrendingUp size={15} className="text-accent" />
    ) : refData.trend === "down" ? (
      <TrendingDown size={15} className="text-[#FF4D4D]" />
    ) : (
      <Minus size={15} className="text-dim" />
    );

  const stats: { label: string; value: string; ctx: string }[] = [
    {
      label: t("fanintel.stat.fairness"),
      value: refData.fairnessScore.toFixed(1),
      ctx: t("fanintel.leagueAvg", { v: "7.4" }),
    },
    {
      label: t("fanintel.stat.avgYellow"),
      value: refData.avgYellow.toFixed(1),
      ctx: t("fanintel.leagueAvg", { v: avgs.avgYellow }),
    },
    {
      label: t("fanintel.stat.avgFouls"),
      value: refData.avgFouls.toFixed(1),
      ctx: t("fanintel.leagueAvg", { v: avgs.avgFouls }),
    },
    {
      label: t("fanintel.stat.fanRating"),
      value: `⭐ ${refData.fanRating.toFixed(1)}`,
      ctx: t("fanintel.leagueAvg", { v: "7.0" }),
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      <main className="mx-auto max-w-lg lg:max-w-3xl">
        <div className="flex items-center gap-2 px-4 pt-3">
          <Link
            href="/referee/"
            aria-label={t("common.back")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:text-white"
          >
            <ArrowLeft size={19} />
          </Link>
        </div>

        {/* header */}
        <div className="px-4 pt-2">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-[22px] font-black text-accent">
              {refInitials(refData.name)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-extrabold text-white">{refData.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-dim ring-1 ring-divider">
                  {refData.league === "Premier League"
                    ? t("fanintel.filter.premierLeague")
                    : t("fanintel.filter.superLig")}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${BAND_CLASS[band]}`}
                >
                  {band === "favorite"
                    ? t("fanintel.badge.favorite")
                    : band === "balanced"
                      ? t("fanintel.badge.balanced")
                      : t("fanintel.badge.strict")}
                </span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-accent">
                  {t("fanintel.fanRated")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 gap-2.5 px-4 pt-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card bg-card p-3 ring-1 ring-divider">
              <p className="text-[9px] font-bold uppercase tracking-wider text-dim">{s.label}</p>
              <p className="pt-1 text-[18px] font-black text-white">{s.value}</p>
              <p className="text-[9px] text-dim/70">{s.ctx}</p>
            </div>
          ))}
        </div>

        {/* charts */}
        <div className="px-4 pt-4">
          <div className="rounded-card bg-card p-3 ring-1 ring-divider">
            <p className="px-1 text-[11px] font-bold text-white">{t("fanintel.cardsChart")}</p>
            <div className="h-36 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cardsData} margin={{ top: 4, right: 8, bottom: 0, left: -26 }}>
                  <XAxis dataKey="game" tick={{ fontSize: 8, fill: "#9AA3AF" }} interval={1} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#9AA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#151A21", border: "1px solid #232A33", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#9AA3AF" }}
                    itemStyle={{ color: "#C8FF3D" }}
                  />
                  <Line type="monotone" dataKey="cards" stroke="#C8FF3D" strokeWidth={2} dot={{ r: 2, fill: "#C8FF3D" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="rounded-card bg-card p-3 ring-1 ring-divider">
            <p className="px-1 text-[11px] font-bold text-white">{t("fanintel.homeWinChart")}</p>
            <div className="h-32 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winData} margin={{ top: 4, right: 8, bottom: 0, left: -30 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9AA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#9AA3AF" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: "#151A21", border: "1px solid #232A33", borderRadius: 8, fontSize: 11 }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    <Cell fill="#C8FF3D" />
                    <Cell fill="#FF4D4D" />
                    <Cell fill="#3A4150" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* insight box */}
        <div className="mx-4 mt-4 rounded-card border-l-2 border-accent bg-card p-3.5">
          <p className="text-[12px] font-bold leading-relaxed text-white">
            {t(insightFor(refData))}
          </p>
          <p className="pt-2 text-[11px] italic leading-relaxed text-dim">
            “{refData.style}”
          </p>
          <p className="flex items-center gap-1 pt-1.5 text-[10px] font-bold text-dim">
            {TrendIcon}
            {refData.trend === "up"
              ? t("fanintel.trend.up")
              : refData.trend === "down"
                ? t("fanintel.trend.down")
                : t("fanintel.trend.flat")}
          </p>
          <p className="pt-1 text-[9px] font-bold uppercase tracking-wider text-dim/60">
            {t("fanintel.styleLabel")}
          </p>
        </div>

        {/* live match */}
        {liveRow && (
          <Link
            href={matchUrl(liveRow.fixtureId)}
            className="mx-4 mt-4 flex items-center gap-3 rounded-card bg-card p-3.5 ring-1 ring-accent/40 transition-colors hover:ring-accent"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <TeamLogo team={liveRow.homeTeam} size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-extrabold text-white">
                {liveRow.homeTeam} {liveRow.score} {liveRow.awayTeam}
              </p>
              <p className="flex items-center gap-1.5 pt-0.5 text-[10px] font-black uppercase tracking-wider text-accent">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
                {t("fanintel.liveNow")} {liveRow.minute != null ? `· ${liveRow.minute}'` : ""}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-dim">
              {t("fanintel.openMatch")} →
            </span>
          </Link>
        )}

        {/* infeed — after the stat cards and charts (placement map) */}
        <div className="px-4 pt-4">
          <AdSlot pos="infeed" />
        </div>

        {/* disclaimer — mandatory */}
        <p className="px-4 pt-5 text-center text-[10px] leading-relaxed text-dim/70">
          {t("fanintel.disclaimer")}
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
