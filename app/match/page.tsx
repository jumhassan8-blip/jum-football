"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, ChevronDown } from "lucide-react";
import type { Match } from "@/lib/jumMock";
import { getMatches, getTopRow } from "@/lib/api";
import { useToast } from "@/lib/store";
import { useT } from "@/lib/i18n";
import Header from "@/components/Header";
import AdSlot from "@/components/AdSlot";
import BottomNav from "@/components/BottomNav";
import MatchCard from "@/components/MatchCard";
import PulseLine from "@/components/PulseLine";

const DAY_ORDER = ["yesterday", "today", "tomorrow"] as const;

export default function MatchPage() {
  const [topRow, setTopRow] = useState<{ id: string; label: string; group?: string[] }[]>([]);
  const [active, setActive] = useState("main");
  const [afconOpen, setAfconOpen] = useState(false);
  const [afconSel, setAfconSel] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const t = useT();
  const toast = useToast();

  const load = () => {
    getMatches().then(setMatches);
  };
  useEffect(() => {
    getTopRow().then(setTopRow);
    load();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      load();
      setRefreshing(false);
      toast("Scores refreshed — still LIVE ⚡");
    }, 900);
  };

  const filtered = useMemo(() => {
    // §4: each tab filters independently and correctly. The AFCON group
    // scopes to its qualifier subgroup when one is selected.
    if (active === "main") return matches;
    if (active === "afcon" && afconSel) {
      return matches.filter((m) => m.leagueId === afconSel);
    }
    return matches.filter((m) => m.leagueId === active);
  }, [active, afconSel, matches]);

  const groups = DAY_ORDER.map((day) => ({
    day,
    items: filtered.filter((m) => m.day === day),
  })).filter((g) => g.items.length > 0);

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdSlot pos="top" />
      </div>

      {/* top league row */}
      <div className="sticky top-14 z-30 border-b border-divider bg-bg/95 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-lg overflow-x-auto lg:max-w-3xl">
          {topRow.map((item) => {
            const isActive = active === item.id;
            return (
              <div key={item.id} className="flex shrink-0 flex-col">
                <button
                  onClick={() => {
                    setActive(item.id);
                    if (item.id === "afcon") setAfconOpen((o) => !o);
                    else setAfconSel(null);
                  }}
                  className={`relative flex min-h-[44px] items-center gap-1 px-3.5 text-[13px] font-bold transition-colors ${
                    isActive ? "text-accent" : "text-dim hover:text-white"
                  }`}
                >
                  {item.label}
                  {item.id === "afcon" && (
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${afconOpen ? "rotate-180" : ""}`}
                    />
                  )}
                  {isActive && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
                  )}
                </button>
                {/* AFCON group submenu */}
                {item.id === "afcon" && afconOpen && (
                  <div className="border-t border-divider bg-card">
                    {item.group?.map((gid) => (
                      <button
                        key={gid}
                        onClick={() => {
                          setAfconSel(gid);
                          setActive("afcon");
                        }}
                        className={`block min-h-[40px] w-full whitespace-nowrap px-4 text-left text-[12px] font-semibold ${
                          afconSel === gid ? "text-accent" : "text-dim hover:text-white"
                        }`}
                      >
                        {gid
                          .split("-")
                          .map((w) => w[0].toUpperCase() + w.slice(1))
                          .join(" ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-lg lg:max-w-3xl">
        <>
            {/* LIVE section with pulse motif */}
            {liveCount > 0 && (active === "main" || active === "global") && (
              <section className="px-4 pt-4">
                <h2 className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-accent">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
                  Live now · JUM Pulse
                </h2>
                <PulseLine className="mt-1" />
              </section>
            )}

            {groups.map((g) => (
              <section key={g.day}>
                <h2 className="py-2.5 text-center text-[12px] font-medium text-dim">
                  {g.items[0].dateLabel}
                </h2>
                <div className="bg-card">
                  {g.items.map((m, i) => (
                    <div key={m.id}>
                      <MatchCard match={m} />
                      {i === 3 && (
                        <div className="border-t border-divider py-1">
                          <AdSlot pos="infeed" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {groups.length === 0 && (
              <p className="py-16 text-center text-[12px] text-dim">
                No fixtures here yet —{" "}
                <Link href="/leagues/" className="font-bold text-accent">
                  browse all leagues
                </Link>
                .
              </p>
            )}
        </>
      </main>

      {/* refresh FAB */}
      <button
        onClick={refresh}
        aria-label={t("a11y.refreshScores")}
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
