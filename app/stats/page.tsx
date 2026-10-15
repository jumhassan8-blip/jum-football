"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Whistle, Activity } from "lucide-react";
import type { Player, StandingRow } from "@/lib/jumMock";
import { getStandings, getTopScorers, teamById } from "@/lib/api";
import Header from "@/components/Header";
import AdBanner from "@/components/AdBanner";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";
import { useT } from "@/lib/i18n";

const SUBTABS = ["Premier League", "La Liga", "Turkish Super Lig", "Saudi Pro League", "Serie A", "UEFA CL"];
const KEY: Record<string, string> = {
  "Premier League": "premier-league",
  "La Liga": "la-liga",
  "Turkish Super Lig": "turkish-super-lig",
  "Saudi Pro League": "saudi-pro-league",
  "Serie A": "serie-a",
  "UEFA CL": "uefa-champions-league",
};
const INNER = ["Tables", "Players", "Fixtures"];

export default function StatsPage() {
  const t = useT();
  const [activeSub, setActiveSub] = useState("Premier League");
  const [activeInner, setActiveInner] = useState("Tables");
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [scorers, setScorers] = useState<Player[]>([]);

  useEffect(() => {
    const key = KEY[activeSub] ?? "premier-league";
    getStandings(key).then(setRows);
    getTopScorers(key).then(setScorers);
  }, [activeSub]);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      <main className="mx-auto max-w-lg lg:max-w-3xl">
        <h1 className="px-4 pt-4 text-[15px] font-extrabold">Hot Competitions Ranking</h1>

        {/* Fan Intelligence hub cards */}
        <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
          <Link
            href="/referee/"
            className="flex items-center gap-2.5 rounded-card bg-card p-3 ring-1 ring-divider transition-colors hover:ring-accent/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Whistle size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-extrabold text-white">
                {t("fanintel.hub.refereesTitle")}
              </span>
              <span className="block truncate text-[10px] text-dim">
                {t("fanintel.hub.refereesDesc")}
              </span>
            </span>
          </Link>
          <Link
            href="/pressure/"
            className="flex items-center gap-2.5 rounded-card bg-card p-3 ring-1 ring-divider transition-colors hover:ring-accent/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Activity size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-extrabold text-white">
                {t("fanintel.hub.pressureTitle")}
              </span>
              <span className="block truncate text-[10px] text-dim">
                {t("fanintel.hub.pressureDesc")}
              </span>
            </span>
          </Link>
        </div>

        <div className="no-scrollbar mt-2 flex overflow-x-auto border-b border-divider">
          {SUBTABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSub(tab)}
              className={`relative flex min-h-[44px] shrink-0 items-center gap-0.5 px-4 text-[13px] font-semibold transition-colors ${
                activeSub === tab ? "text-accent" : "text-dim hover:text-white"
              }`}
            >
              {tab}
              {tab === "UEFA CL" && <ChevronDown size={12} />}
              {activeSub === tab && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
          <button className="ml-auto flex shrink-0 items-center gap-1 px-4 text-[12px] font-semibold text-dim">
            26/27
            <ChevronDown size={12} />
          </button>
        </div>

        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-3">
          {INNER.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveInner(tab)}
              className={`min-h-[36px] shrink-0 rounded-full px-4 text-[12px] font-bold transition-colors ${
                activeInner === tab
                  ? "bg-accent text-bg"
                  : "bg-card text-dim ring-1 ring-divider hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="px-4">
          {activeInner === "Tables" &&
            (rows.length ? (
              <>
              <div className="overflow-hidden rounded-card bg-card">
                <div className="grid grid-cols-[22px_minmax(0,1fr)_24px_24px_24px_24px_40px_30px] items-center gap-x-1 border-b border-divider px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-dim">
                  <span>#</span><span>Team</span>
                  <span className="text-center">P</span><span className="text-center">W</span>
                  <span className="text-center">D</span><span className="text-center">L</span>
                  <span className="text-center">F/A</span><span className="text-right">Pts</span>
                </div>
                {rows.map((row, i) => {
                  const team = teamById(row.teamId)!;
                  return (
                    <div
                      key={row.teamId}
                      className={`grid grid-cols-[22px_minmax(0,1fr)_24px_24px_24px_24px_40px_30px] items-center gap-x-1 border-b border-divider px-3 py-2.5 last:border-0 ${
                        i < 4 ? "bg-accent/[0.07]" : i % 2 === 0 ? "bg-[#10141A]" : "bg-card"
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
                      <span className="text-center text-[11px] text-dim">{row.gf}/{row.ga}</span>
                      <span className="text-right text-[12px] font-black text-accent">{row.pts}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center pt-3">
                <AdBanner variant="mid" />
              </div>
              </>
            ) : (
              <p className="rounded-card bg-card p-8 text-center text-[12px] text-dim">
                Table not seeded for {activeSub} yet.
              </p>
            ))}

          {activeInner === "Players" &&
            (scorers.length ? (
              <div className="divide-y divide-divider rounded-card bg-card">
                {scorers.map((p, i) => {
                  const team = teamById(p.teamId)!;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-5 text-center text-[13px] font-black text-dim">{i + 1}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-[12px] font-black text-accent">
                        {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{p.name}</p>
                        <p className="flex items-center gap-1.5 text-[11px] text-dim">
                          <TeamBadge team={team} size={13} />
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
                No scorer data seeded yet.
              </p>
            ))}

          {activeInner === "Fixtures" && (
            <p className="rounded-card bg-card p-8 text-center text-[12px] text-dim">
              Fixtures for {activeSub} live on the league page.{" "}
              <a href={`/league/${KEY[activeSub]}/`} className="font-bold text-accent">
                Open league page →
              </a>
            </p>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
