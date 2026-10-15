"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import type { Match } from "@/lib/jumMock";
import { leagueById, teamById } from "@/lib/api";
import { useToast } from "@/lib/store";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";
import JumPulse from "@/components/JumPulse";
import AdBanner from "@/components/AdBanner";
import MomentumChart from "@/components/engage/MomentumChart";
import MatchPoll from "@/components/engage/MatchPoll";
import RaffleCard from "@/components/engage/RaffleCard";
import LiveChat from "@/components/engage/LiveChat";
import MatchLike from "@/components/engage/MatchLike";
import { useT } from "@/lib/i18n";

export default function MatchDetail({ match }: { match: Match }) {
  const t = useT();
  const home = teamById(match.homeId)!;
  const away = teamById(match.awayId)!;
  const league = leagueById(match.leagueId);
  const toast = useToast();
  const [tab, setTab] = useState<"Pulse" | "Timeline" | "Stats">("Pulse");
  const live = match.status === "live";

  const share = async () => {
    const text = `${home.name} ${match.homeScore}-${match.awayScore} ${away.name} · ${league?.name} · via JUM Football`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "JUM Football", text });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Match link copied to clipboard");
    } catch {
      toast("Sharing not available here");
    }
  };

  const momentumPct = Math.min(100, Math.abs(match.momentum ?? 0));

  return (
    <div className="min-h-screen pb-24">
      <Header />

      {/* scoreboard */}
      <div className="border-b border-divider bg-card">
        <div className="mx-auto max-w-lg px-4 pb-4 pt-2 lg:max-w-3xl">
          <div className="flex items-center justify-between">
            <Link
              href="/match/"
              aria-label={t("a11y.backToMatches")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <p className="text-[11px] font-bold uppercase tracking-widest text-dim">
              {league?.name} · {match.round}
            </p>
            <button
              onClick={share}
              aria-label={t("common.share")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white"
            >
              <Share2 size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <TeamBadge team={home} size={48} />
              <span className="text-center text-[12px] font-semibold">{home.name}</span>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black tabular-nums tracking-tight">
                {match.homeScore}
                <span className="mx-1.5 text-white/25">–</span>
                {match.awayScore}
              </p>
              <p
                className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                  live ? "bg-accent text-bg" : "bg-black text-dim"
                }`}
              >
                {live ? `${match.minute}' LIVE` : match.status === "ns" ? "Upcoming" : "Full time"}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <TeamBadge team={away} size={48} />
              <span className="text-center text-[12px] font-semibold">{away.name}</span>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="mx-auto flex max-w-lg gap-1 px-4 lg:max-w-3xl">
          {(["Pulse", "Timeline", "Stats"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative min-h-[42px] flex-1 text-[13px] font-bold transition-colors ${
                tab === t ? "text-accent" : "text-dim hover:text-white"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4 lg:max-w-3xl">
        {tab === "Pulse" &&
          (live ? (
            <JumPulse match={match} />
          ) : (
            <p className="rounded-card bg-card p-6 text-center text-[12px] text-dim">
              JUM Pulse goes live at kick-off — come back when the whistle blows.
            </p>
          ))}

        {tab === "Timeline" && (
          <div className="rounded-card bg-card">
            {(match.events ?? []).length === 0 ? (
              <p className="p-6 text-center text-[12px] text-dim">
                {match.status === "ns" ? "Timeline starts at kick-off." : "No key events recorded."}
              </p>
            ) : (
              [...(match.events ?? [])]
                .sort((a, b) => b.minute - a.minute)
                .map((e, i) => (
                  <div
                    key={i}
                    className="flex gap-3 border-b border-divider px-4 py-3 last:border-0"
                  >
                    <span
                      className={`flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${
                        e.type === "goal" ? "bg-accent text-bg" : "bg-black text-accent"
                      }`}
                    >
                      {e.minute}&prime;
                    </span>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">{e.text}</p>
                      <p className="text-[11px] text-dim">
                        {e.side === "home" ? home.name : away.name} ·{" "}
                        {e.type === "goal" ? "Goal" : e.type.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {tab === "Stats" && (
          <div className="space-y-3 rounded-card bg-card p-4">
            <div>
              <div className="mb-1 flex justify-between text-[11px] font-bold">
                <span style={{ color: home.color }}>{home.short}</span>
                <span className="uppercase tracking-widest text-dim">Momentum</span>
                <span style={{ color: away.color }}>{away.short}</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-black">
                <div
                  className="rounded-l-full"
                  style={{
                    width: `${momentumPct}%`,
                    backgroundColor: (match.momentum ?? 0) >= 0 ? home.color : away.color,
                    marginLeft: (match.momentum ?? 0) >= 0 ? 0 : `${100 - momentumPct}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-center text-[11px] text-dim">
                {(match.momentum ?? 0) >= 0 ? "Slight home lean" : "Slight away lean"} ·{" "}
                {Math.abs(match.momentum ?? 0)}/100
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { k: "Tipsters on it", v: String(match.tipsters) },
                { k: "Round", v: match.round },
                { k: "Status", v: live ? "LIVE" : match.status.toUpperCase() },
              ].map((s) => (
                <div key={s.k} className="rounded-lg bg-white/[0.04] p-2.5">
                  <p className="text-[15px] font-black text-accent">{s.v}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-dim">{s.k}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* engagement stack — every match, every tab */}
      <div className="mx-auto mt-4 max-w-lg space-y-4 px-4 lg:max-w-3xl">
        <div className="flex items-center gap-2">
          <MatchLike match={match} />
          <p className="text-[11px] leading-tight text-dim">
            {match.tipsters} tipsters tracking · {live ? "JUM Pulse active" : "Pulse opens at kick-off"}
          </p>
        </div>
        {live && <MomentumChart match={match} home={home} away={away} />}
        <MatchPoll match={match} home={home} away={away} />
        <RaffleCard match={match} />
        <LiveChat match={match} />
        {/* first ad on the match screen sits below the momentum graph */}
        <div className="pt-2">
          <AdBanner variant="mid" />
        </div>
        {/* reserved space for the fixed sticky ad */}
        <div className="h-[50px]" aria-hidden />
        <AdBanner variant="bottom" />
      </div>

      <BottomNav />
    </div>
  );
}
