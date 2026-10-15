"use client";
import { useT } from "@/lib/i18n";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import type { League } from "@/lib/jumMock";
import { getConfederations, getLeagues } from "@/lib/api";
import Header from "@/components/Header";
import AdBanner from "@/components/AdBanner";
import BottomNav from "@/components/BottomNav";

export default function LeaguesPage() {
  const t = useT();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [confeds, setConfeds] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>("UEFA");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getLeagues().then(setLeagues);
    getConfederations().then(setConfeds);
  }, []);

  const searching = query.trim().length > 0;
  const results = useMemo(() => {
    if (!searching) return [];
    const q = query.trim().toLowerCase();
    return leagues.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q) ||
        l.confederation.toLowerCase().includes(q)
    );
  }, [leagues, query, searching]);

  // confed -> country (A-Z) -> leagues
  const tree = useMemo(() => {
    const map = new Map<string, Map<string, League[]>>();
    leagues.forEach((l) => {
      if (!map.has(l.confederation)) map.set(l.confederation, new Map());
      const countries = map.get(l.confederation)!;
      if (!countries.has(l.country)) countries.set(l.country, []);
      countries.get(l.country)!.push(l);
    });
    return [...map.entries()].map(([confed, countries]) => [
      confed,
      [...countries.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    ] as [string, [string, League[]][]]);
  }, [leagues]);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      <main className="mx-auto max-w-lg px-4 pt-4 lg:max-w-3xl">
        <h1 className="text-[16px] font-extrabold">Every league in the world</h1>

        <div className="mt-3 flex items-center gap-2.5 rounded-full bg-card px-4 ring-1 ring-divider">
          <Search size={16} className="shrink-0 text-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("leagues.search")}
            className="min-h-[42px] w-full bg-transparent text-[13px] outline-none placeholder:text-dim/60"
          />
        </div>

        {searching ? (
          <div className="mt-3 rounded-card bg-card">
            {results.map((l) => (
              <Link
                key={l.id}
                href={`/league/${l.id}/`}
                className="flex items-center justify-between border-b border-divider px-4 py-3 last:border-0 active:bg-white/5"
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
            {results.length === 0 && (
              <p className="p-8 text-center text-[12px] text-dim">No leagues match “{query}”.</p>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {confeds.map((confed) => {
              const entry = tree.find(([c]) => c === confed);
              const isOpen = open === confed;
              const countryCount = entry?.[1].length ?? 0;
              return (
                <div key={confed}>
                <div className="overflow-hidden rounded-card bg-card">
                  <button
                    onClick={() => setOpen(isOpen ? null : confed)}
                    className="flex min-h-[48px] w-full items-center justify-between px-4"
                  >
                    <span className="text-[14px] font-extrabold">{confed}</span>
                    <span className="flex items-center gap-2 text-[11px] text-dim">
                      {countryCount} countries
                      <ChevronRight
                        size={16}
                        className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                    </span>
                  </button>
                  {isOpen && entry && (
                    <div className="border-t border-divider">
                      {entry[1].map(([country, items]) => (
                        <div key={country} className="px-4 py-2.5">
                          <p className="text-[11px] font-black uppercase tracking-widest text-dim">
                            {country}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {items.map((l) => (
                              <Link
                                key={l.id}
                                href={`/league/${l.id}/`}
                                className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold ring-1 ring-divider transition-colors hover:text-accent"
                              >
                                {l.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {confed === "CONMEBOL" && (
                  <div className="flex justify-center pt-2">
                    <AdBanner variant="mid" />
                  </div>
                )}
                </div>
              );
          })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
