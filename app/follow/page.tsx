"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, Plus } from "lucide-react";
import type { Team } from "@/lib/jumMock";
import { TEAMS } from "@/lib/jumMock";
import { searchAll } from "@/lib/api";
import { fireConfetti, useToast } from "@/lib/store";
import { useFollowedTeams } from "@/lib/follows";
import { requestPushAndStoreToken } from "@/lib/messaging";
import PushBanner from "@/components/PushBanner";
import { useT } from "@/lib/i18n";
import Header from "@/components/Header";
import AdBanner from "@/components/AdBanner";
import FansBoard from "@/components/FansBoard";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";

const SECTIONS: { title: string; ids: string[] }[] = [
  { title: "Hot", ids: ["gs", "fb", "nas", "bar", "rma", "mci"] },
  { title: "Türkiye", ids: ["gs", "fb", "bjk", "ts"] },
  { title: "England", ids: ["mci", "ars", "liv", "che", "bha", "new"] },
  { title: "Spain", ids: ["bar", "rma", "atm", "sev", "val", "lev"] },
  { title: "Saudi Arabia", ids: ["nas", "hil", "itt"] },
  { title: "Brazil", ids: ["fla", "flu", "pal"] },
];

export default function FollowPage() {
  const { ids, addMany, uid } = useFollowedTeams();
  const t = useT();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      searchAll(query).then((r) => setResults(r.teams));
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const searching = query.trim().length > 0;
  const teamByIdMap = useMemo(() => Object.fromEntries(TEAMS.map((t) => [t.id, t])), []);
  const pending = selected.filter((name) => !ids.includes(name));

  const toggleSelect = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const card = (team: Team) => {
    const followed = ids.includes(team.name);
    const picked = selected.includes(team.name);
    return (
      <button
        key={team.id}
        onClick={() => toggleSelect(team.name)}
        className={`relative flex flex-col items-center gap-2 rounded-card px-2 py-4 ring-1 transition-transform active:scale-[0.97] ${
          picked ? "bg-accent/10 ring-accent" : "bg-card ring-divider"
        }`}
      >
        {(followed || picked) && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-bg">
            <Check size={10} strokeWidth={3.5} />
          </span>
        )}
        <TeamBadge team={team} size={48} />
        <span className="w-full truncate text-center text-[11px] font-semibold">{team.name}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      <main className="mx-auto max-w-lg px-4 pt-4 lg:max-w-3xl">
        <h1 className="py-2 text-center text-[16px] font-extrabold">Follow your teams</h1>
        <PushBanner />

        <div className="flex items-center gap-2.5 rounded-full bg-card px-4 ring-1 ring-divider">
          <Search size={16} className="shrink-0 text-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("follow.searchTeam")}
            className="min-h-[42px] w-full bg-transparent text-[13px] outline-none placeholder:text-dim/60"
          />
        </div>

        {searching ? (
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {results.map((t) => card(t))}
            {results.length === 0 && (
              <p className="col-span-3 py-8 text-center text-[12px] text-dim">
                No teams found for “{query}”.
              </p>
            )}
          </div>
        ) : (
          SECTIONS.map((section) => (
            <section key={section.title} className="mt-5">
              <h2 className="mb-2 text-[13px] font-bold">{section.title}</h2>
              <div className="grid grid-cols-3 gap-2.5">
                {section.ids.map((id) => card(teamByIdMap[id]))}
              </div>
            </section>
          ))
        )}
      </main>

      <div className="mx-auto max-w-lg space-y-4 px-4 pb-6 lg:max-w-3xl">
        <div className="flex justify-center">
          <AdBanner variant="mid" />
        </div>
        <FansBoard />
      </div>

      {pending.length > 0 && (
        <button
          onClick={() => {
            addMany(pending);
            // in-context permission ask — the follow tap IS the user gesture
            void requestPushAndStoreToken(uid);
            fireConfetti();
            toast(`${pending.length} team${pending.length > 1 ? "s" : ""} pinned to your MATCH tab`);
            setSelected([]);
          }}
          className="fixed bottom-20 right-4 z-50 flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[13px] font-bold text-bg shadow-lg shadow-black/40 active:scale-95"
        >
          <Plus size={15} strokeWidth={3} />
          Next &gt; · {pending.length}
        </button>
      )}

      <BottomNav />
    </div>
  );
}
