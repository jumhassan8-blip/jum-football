"use client";

import { useMemo, useState } from "react";
import type { Match, Team } from "@/lib/jumMock";
import { pollFor } from "@/lib/api";
import { awardFanPoints, usePoll, useToast, type PollVote } from "@/lib/store";

/** "Who will win?" poll — one vote per user, persisted. */
export default function MatchPoll({ match, home, away }: { match: Match; home: Team; away: Team }) {
  const seed = useMemo(() => pollFor(match.id), [match.id]);
  const { vote, cast } = usePoll(match.id);
  const toast = useToast();
  const [optimistic, setOptimistic] = useState<PollVote | null>(null);

  const effective = optimistic ?? vote;
  const counts = {
    home: seed.home + (effective === "home" ? 1 : 0),
    draw: seed.draw + (effective === "draw" ? 1 : 0),
    away: seed.away + (effective === "away" ? 1 : 0),
  };
  const total = counts.home + counts.draw + counts.away;

  const options: { key: PollVote; label: string; color: string; n: number }[] = [
    { key: "home", label: home.name, color: home.color, n: counts.home },
    { key: "draw", label: "Draw", color: "#9AA3AF", n: counts.draw },
    { key: "away", label: away.name, color: away.color, n: counts.away },
  ];

  return (
    <section className="rounded-card bg-card p-4">
      <h3 className="text-[13px] font-extrabold">Who will win?</h3>
      <p className="mb-2.5 text-[10px] text-dim">{total.toLocaleString()} votes · one per fan</p>
      <div className="space-y-2">
        {options.map((o) => {
          const pct = Math.round((o.n / total) * 100);
          const mine = effective === o.key;
          return (
            <button
              key={o.key}
              disabled={!!effective}
              onClick={() => {
                if (cast(o.key)) {
                  setOptimistic(o.key);
                  awardFanPoints(3);
                  toast("Vote locked in ⚽");
                }
              }}
              className={`relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition ${
                mine ? "border-accent" : "border-white/10 hover:border-white/25"
              } ${effective && !mine ? "opacity-60" : ""}`}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-lg opacity-25 transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: o.color }}
              />
              <span className="relative flex items-center justify-between text-[12px] font-bold">
                <span className="flex items-center gap-1.5">
                  {mine && <span className="text-accent">✓</span>}
                  {o.label}
                </span>
                <span className={mine ? "text-accent" : "text-dim"}>{effective ? `${pct}%` : "Vote"}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
