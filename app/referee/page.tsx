"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AdSlot from "@/components/AdSlot";
import { useT } from "@/lib/i18n";
import {
  REFEREES,
  fairnessBand,
  refInitials,
  findRefByName,
  type Referee,
  type RefTrend,
} from "@/lib/fanintel";
import { trackEvent } from "@/lib/analytics";

type LiveStatsRow = {
  fixtureId: number;
  refereeName: string | null;
};

type Filter = "all" | "fairest" | "Premier League" | "Super Lig";

const FILTERS: Filter[] = ["all", "fairest", "Premier League", "Super Lig"];

/** Same mapping the /live cards use: /match/1{last5}. */
const matchUrl = (fixtureId: number) => `/match/1${String(fixtureId).slice(-5)}/`;

function TrendIcon({ trend }: { trend: RefTrend }) {
  if (trend === "up") return <TrendingUp size={14} className="text-accent" aria-label="up" />;
  if (trend === "down") return <TrendingDown size={14} className="text-[#FF4D4D]" aria-label="down" />;
  return <Minus size={14} className="text-dim" aria-label="flat" />;
}

export default function RefereeListPage() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [officiating, setOfficiating] = useState<Map<string, number>>(new Map()); // refId → fixtureId
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/live-stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((json: { rows?: LiveStatsRow[] }) => {
        if (cancelled) return;
        const map = new Map<string, number>();
        for (const row of json.rows ?? []) {
          const ref = findRefByName(row.refereeName);
          if (ref && !map.has(ref.id)) map.set(ref.id, row.fixtureId);
        }
        setOfficiating(map);
        setLiveLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REFEREES.filter((r: Referee) => {
      if (filter === "fairest" && r.fairnessScore < 8) return false;
      if ((filter === "Premier League" || filter === "Super Lig") && r.league !== filter)
        return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.fairnessScore - a.fairnessScore);
  }, [filter, query]);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <AdSlot pos="top" />

      <main className="mx-auto max-w-lg lg:max-w-3xl">
        <h1 className="px-4 pt-4 text-[17px] font-extrabold">{t("fanintel.title")}</h1>
        <p className="px-4 pt-1 text-[12px] text-dim">{t("fanintel.subtitle")}</p>

        {/* filter chips + search */}
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                trackEvent("ref_filter_used", { filter: f });
              }}
              className={`min-h-[36px] shrink-0 rounded-full px-4 text-[12px] font-bold transition-colors ${
                filter === f
                  ? "bg-accent text-bg"
                  : "bg-card text-dim ring-1 ring-divider hover:text-white"
              }`}
            >
              {f === "all"
                ? t("fanintel.filter.all")
                : f === "fairest"
                  ? t("fanintel.filter.fairest")
                  : f === "Premier League"
                    ? t("fanintel.filter.premierLeague")
                    : t("fanintel.filter.superLig")}
            </button>
          ))}
        </div>
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 rounded-card bg-card px-3 py-2.5 ring-1 ring-divider focus-within:ring-accent">
            <Search size={16} className="shrink-0 text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("fanintel.searchPlaceholder")}
              aria-label={t("fanintel.searchPlaceholder")}
              className="w-full bg-transparent text-[13px] text-white placeholder:text-dim/60 focus:outline-none"
            />
          </div>
        </div>

        <p className="px-4 pt-2 text-[11px] font-bold text-dim">
          {t("fanintel.refsCount", { n: refs.length })}
        </p>

        {/* card grid */}
        <div className="grid grid-cols-1 gap-2.5 px-4 pt-2 sm:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {refs.map((r) => {
              const band = fairnessBand(r.fairnessScore);
              const liveFixture = officiating.get(r.id);
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  <Link
                    href={`/referee/${r.id}/`}
                    className="block rounded-card bg-card p-3.5 ring-1 ring-divider transition-colors hover:ring-accent/50"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[14px] font-black text-accent">
                        {refInitials(r.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-extrabold text-white">{r.name}</p>
                          <TrendIcon trend={r.trend} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-dim ring-1 ring-divider">
                            {r.league === "Premier League"
                              ? t("fanintel.filter.premierLeague")
                              : t("fanintel.filter.superLig")}
                          </span>
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-accent">
                            {t("fanintel.fanRated")}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-right">
                        <span
                          className={`text-[18px] font-black ${
                            band === "favorite"
                              ? "text-accent"
                              : band === "balanced"
                                ? "text-white"
                                : "text-[#FF4D4D]"
                          }`}
                        >
                          {r.fairnessScore.toFixed(1)}
                        </span>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-dim">
                          {t("fanintel.fairness")}
                        </span>
                      </span>
                    </div>

                    {/* fairness progress bar */}
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${r.fairnessScore * 10}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-dim">
                      <span>
                        🟨 {t("fanintel.avgYellow")} {r.avgYellow.toFixed(1)}
                      </span>
                      <span className="font-bold text-white">
                        ⭐ {r.fanRating.toFixed(1)}
                      </span>
                    </div>

                    {liveFixture && (
                      <Link
                        href={matchUrl(liveFixture)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-accent/15 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent"
                      >
                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
                        {t("fanintel.officiatingNow")}
                      </Link>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {refs.length === 0 && (
          <div className="mx-4 mt-6 rounded-card bg-card p-8 text-center ring-1 ring-divider">
            <p className="text-[13px] font-bold text-dim">{t("fanintel.empty")}</p>
          </div>
        )}

        {liveLoading && <div className="px-4 pt-2 text-[10px] text-dim/60"> </div>}
      </main>

      <AdSlot pos="infeed" />
      {/* reserved space for the fixed sticky ad — no content overlap */}
      <div className="h-[50px]" aria-hidden />
      <AdSlot pos="mobileSticky" />
      <BottomNav />
    </div>
  );
}
