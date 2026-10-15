"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Match, Player, StandingRow } from "@/lib/jumMock";
import { leagueById, teamById } from "@/lib/api";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";
import MatchCard from "@/components/MatchCard";
import AdBanner from "@/components/AdBanner";
import { useT } from "@/lib/i18n";

export default function LeagueView({
  leagueId,
  standings,
  matches,
  scorers,
}: {
  leagueId: string;
  standings: StandingRow[];
  matches: Match[];
  scorers: Player[];
}) {
  const t = useT();
  const league = leagueById(leagueId);
  const [tab, setTab] = useState<"Table" | "Fixtures" | "Top Scorers">("Table");

  return (
    <div className="min-h-screen pb-24">
      <Header />

      <div className="border-b border-divider bg-card">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3 lg:max-w-3xl">
          <Link
            href="/leagues/"
            aria-label={t("common.back")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-[16px] font-extrabold leading-tight">{league?.name}</h1>
            <p className="text-[11px] font-semibold text-dim">
              {league?.country} · {league?.confederation} · 2026/27
            </p>
          </div>
        </div>
        <div className="mx-auto flex max-w-lg gap-1 px-4 lg:max-w-3xl">
          {(["Table", "Fixtures", "Top Scorers"] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`relative min-h-[42px] flex-1 text-[13px] font-bold transition-colors ${
                tab === tb ? "text-accent" : "text-dim hover:text-white"
              }`}
            >
              {tb === "Table" ? t("league.table") : tb === "Fixtures" ? t("stats.fixtures") : t("league.topScorers")}
              {tab === tb && (
                <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 pt-4 lg:max-w-3xl">
        {tab === "Table" &&
          (standings.length ? (
            <div className="overflow-hidden rounded-card bg-card">
              <div className="grid grid-cols-[22px_minmax(0,1fr)_24px_24px_24px_24px_40px_30px] items-center gap-x-1 border-b border-divider px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-dim">
                <span>#</span><span>{t("common.team")}</span>
                <span className="text-center">{t("stats.played")}</span><span className="text-center">{t("stats.won")}</span>
                <span className="text-center">{t("stats.drawn")}</span><span className="text-center">{t("stats.lost")}</span>
                <span className="text-center">{t("stats.goals")}</span><span className="text-right">{t("stats.points")}</span>
              </div>
              {standings.map((row, i) => {
                const team = teamById(row.teamId)!;
                return (
                  <div
                    key={row.teamId}
                    className={`grid grid-cols-[22px_minmax(0,1fr)_24px_24px_24px_24px_40px_30px] items-center gap-x-1 border-b border-divider px-3 py-2.5 last:border-0 ${
                      i < 4 ? "bg-accent/[0.06]" : i % 2 === 0 ? "bg-[#10141A]" : "bg-card"
                    }`}
                  >
                    <span className="text-[12px] font-bold text-dim">{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamBadge team={team} size={20} />
                      <span className="truncate text-[12px] font-semibold">{team.name}</span>
                    </span>
                    <span className="text-center text-[11px] text-dim">{row.p}</span>
                    <span className="text-center text-[11px]">{row.w}</span>
                    <span className="text-center text-[11px]">{row.d}</span>
                    <span className="text-center text-[11px]">{row.l}</span>
                    <span className="text-center text-[11px] text-dim">
                      {row.gf}/{row.ga}
                    </span>
                    <span className="text-right text-[12px] font-black text-accent">{row.pts}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-card bg-card p-8 text-center text-[12px] text-dim">
              {t("stats.empty")}
            </p>
          ))}

        {tab === "Fixtures" &&
          (matches.length ? (
            <div className="-mx-4">
              <div className="bg-card">
                {matches.map((m, i) => (
                  <div key={m.id}>
                    <MatchCard match={m} />
                    {i === 2 && (
                      <div className="flex justify-center border-t border-divider py-3">
                        <AdBanner variant="mid" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-card bg-card p-8 text-center text-[12px] text-dim">
              {t("stats.empty")}
            </p>
          ))}

        {tab === "Top Scorers" &&
          (scorers.length ? (
            <div className="overflow-hidden rounded-card bg-card">
              {scorers.map((p, i) => {
                const team = teamById(p.teamId)!;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-0"
                  >
                    <span className="w-5 text-center text-[13px] font-black text-dim">{i + 1}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-[12px] font-black text-accent">
                      {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">{p.name}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-dim">
                        <TeamBadge team={team} size={14} />
                        {team.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-black text-accent">{p.goals}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-dim">Goals</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-card bg-card p-8 text-center text-[12px] text-dim">
              Scorer data not seeded for this league yet.
            </p>
          ))}
      </main>

      <BottomNav />
    </div>
  );
}
