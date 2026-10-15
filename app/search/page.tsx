"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Shield, Trophy, User, ChevronRight } from "lucide-react";
import type { League, Player, Team } from "@/lib/jumMock";
import { searchAll, teamById } from "@/lib/api";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AdBanner from "@/components/AdBanner";
import TeamBadge from "@/components/TeamBadge";
import { useT } from "@/lib/i18n";

interface Results {
  teams: Team[];
  leagues: League[];
  players: Player[];
}

export default function SearchPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>({ teams: [], leagues: [], players: [] });

  useEffect(() => {
    const t = setTimeout(() => searchAll(query).then(setResults), 150);
    return () => clearTimeout(t);
  }, [query]);

  const hasAny =
    results.teams.length + results.leagues.length + results.players.length > 0;

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      <main className="mx-auto max-w-lg px-4 pt-4 lg:max-w-3xl">
        <div className="flex items-center gap-2.5 rounded-full bg-card px-4 ring-1 ring-divider">
          <SearchIcon size={16} className="shrink-0 text-dim" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.everything")}
            className="min-h-[44px] w-full bg-transparent text-[13px] outline-none placeholder:text-dim/60"
          />
        </div>

        <div className="mt-4 space-y-5">
          {!hasAny && (
            <p className="py-14 text-center text-[12px] text-dim">
              {query
                ? `Nothing found for “${query}”.`
                : "Search the entire JUM dataset — teams, 80+ leagues, players."}
            </p>
          )}

          {results.teams.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-dim">
                <Shield size={12} /> Teams
              </h3>
              <div className="divide-y divide-divider rounded-card bg-card">
                {results.teams.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <TeamBadge team={t} size={32} />
                    <div className="flex-1">
                      <p className="text-[13px] font-bold">{t.name}</p>
                      <p className="text-[11px] text-dim">{t.country}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.teams.length > 0 && results.leagues.length > 0 && (
            <div className="flex justify-center py-2">
              <AdBanner variant="mid" />
            </div>
          )}

          {results.leagues.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-dim">
                <Trophy size={12} /> Leagues
              </h3>
              <div className="divide-y divide-divider rounded-card bg-card">
                {results.leagues.map((l) => (
                  <Link
                    key={l.id}
                    href={`/league/${l.id}/`}
                    className="flex items-center justify-between px-4 py-3 active:bg-white/5"
                  >
                    <div>
                      <p className="text-[13px] font-bold">{l.name}</p>
                      <p className="text-[11px] text-dim">
                        {l.country} · {l.confederation}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-dim" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.players.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-dim">
                <User size={12} /> Players
              </h3>
              <div className="divide-y divide-divider rounded-card bg-card">
                {results.players.map((p) => {
                  const team = teamById(p.teamId)!;
                  return (
                    <Link
                      key={p.id}
                      href={`/player/${p.id}/`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-[12px] font-black text-accent">
                        {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </span>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold">{p.name}</p>
                        <p className="flex items-center gap-1.5 text-[11px] text-dim">
                          <TeamBadge team={team} size={13} />
                          {team.name} · {p.goals} goals
                        </p>
                      </div>
                      <span className="text-[12px] font-black text-accent">{p.rating.toFixed(1)}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
