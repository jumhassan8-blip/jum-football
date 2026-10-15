"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, Minus, Plane } from "lucide-react";
import type { Match, MatchEvent } from "@/lib/jumMock";
import { comebackChance, teamById, winProbability } from "@/lib/api";
import { notifyGoal, useReactions, useToast } from "@/lib/store";

const REACTIONS = [
  { kind: "wow" as const, emoji: "😱", label: "WOW" },
  { kind: "fire" as const, emoji: "🔥", label: "FIRE" },
  { kind: "goal" as const, emoji: "⚽", label: "GOAL" },
];

export default function JumPulse({ match }: { match: Match }) {
  const toast = useToast();
  const { counts, pulse } = useReactions(match.id, match.reactions ?? { wow: 0, fire: 0, goal: 0 });
  const [minute, setMinute] = useState(match.minute ?? 0);

  // demo clock — one real second per match minute
  useEffect(() => {
    if (match.status !== "live") return;
    const iv = setInterval(
      () => setMinute((m) => (m < 90 ? m + 1 : m)),
      1000
    );
    return () => clearInterval(iv);
  }, [match.status]);

  const timedMatch = useMemo(() => ({ ...match, minute }), [match, minute]);

  // events shift the wave as the demo clock passes them
  const applied: MatchEvent[] = useMemo(
    () => (match.events ?? []).filter((e) => e.minute <= minute),
    [match.events, minute]
  );
  const probs = useMemo(() => winProbability(timedMatch, applied), [timedMatch, applied]);

  const home = teamById(match.homeId)!;
  const away = teamById(match.awayId)!;

  // mock goal events fire a system notification (if permitted) + in-app toast
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const e of applied) {
      const key = `${e.minute}-${e.side}-${e.type}`;
      if (e.type === "goal" && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        const scorer = e.text.split("·")[0]?.trim() ?? e.text;
        notifyGoal("⚽ GOAL — JUM Football", `${scorer} · ${home.short} ${match.homeScore}-${match.awayScore} ${away.short}`);
        toast(`⚽ GOAL! ${scorer} (${e.minute}')`);
      }
    }
  }, [applied, toast, home.short, away.short, match.homeScore, match.awayScore]);
  const homeCb = comebackChance(timedMatch, "home");
  const awayCb = comebackChance(timedMatch, "away");
  const total = counts.wow + counts.fire + counts.goal;

  const wavePath = useMemo(() => {
    // 3-layer wave heights from probabilities
    const h = probs.h * 0.9;
    const d = probs.d * 0.9;
    const a = probs.a * 0.9;
    return {
      home: `M0 ${46 - h * 0.35} Q 60 ${46 - h} 120 ${46 - h * 0.5} T 240 ${46 - h * 0.6} V46 H0 Z`,
      draw: `M0 ${46 - d * 0.3} Q 60 ${46 - d} 120 ${46 - d * 0.5} T 240 ${46 - d * 0.55} V46 H0 Z`,
      away: `M0 ${46 - a * 0.32} Q 60 ${46 - a} 120 ${46 - a * 0.5} T 240 ${46 - a * 0.58} V46 H0 Z`,
    };
  }, [probs]);

  return (
    <section className="overflow-hidden rounded-card bg-card ring-1 ring-accent/20">
      {/* header */}
      <div className="flex items-center justify-between border-b border-divider px-3.5 py-2.5">
        <h3 className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-accent">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
          JUM Pulse
        </h3>
        <span className="text-[11px] font-bold tabular-nums text-dim">{minute}&prime;</span>
      </div>

      {/* crowd meter */}
      <div className="px-3.5 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-dim">
            World Meter
          </p>
          <p className="text-[13px] font-black tabular-nums text-accent">
            {total.toLocaleString()}
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          {REACTIONS.map((r) => (
            <button
              key={r.kind}
              onClick={() => {
                pulse(r.kind);
                toast(`${r.emoji} Pulse sent — the world meter rises`);
              }}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.04] text-[12px] font-bold text-white ring-1 ring-divider transition-transform active:scale-95"
            >
              <span className="text-[16px]">{r.emoji}</span>
              <span className="tabular-nums text-dim">{counts[r.kind].toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* win probability wave */}
      <div className="px-3.5 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-dim">
          Win Probability Wave
        </p>
        <svg viewBox="0 0 240 52" className="mt-1 h-16 w-full" aria-hidden>
          {[wavePath.home, wavePath.draw, wavePath.away].map((d, i) => (
            <path
              key={i}
              d={d}
              fill={i === 0 ? home.color : i === 1 ? "#9AA3AF" : away.color}
              opacity={i === 1 ? 0.18 : 0.32}
            />
          ))}
          <line x1="0" y1="46" x2="240" y2="46" stroke="#232A33" strokeWidth="1" />
        </svg>
        <div className="flex justify-between text-[11px] font-bold">
          <span style={{ color: home.color }}>{home.short} {probs.h}%</span>
          <span className="text-dim">Draw {probs.d}%</span>
          <span style={{ color: away.color }}>{away.short} {probs.a}%</span>
        </div>
      </div>

      {/* Comeback Radar */}
      <div className="mx-3.5 mt-3.5 rounded-lg bg-white/[0.04] p-3 ring-1 ring-divider">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent2">
          Comeback Radar
        </p>
        <div className="mt-1.5 space-y-1 text-[13px] font-semibold">
          {homeCb > 0 && (
            <p className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-accent" />
              {home.name} comeback chance: {homeCb}% ↑
            </p>
          )}
          {awayCb > 0 && (
            <p className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-accent" />
              {away.name} comeback chance: {awayCb}% ↑
            </p>
          )}
          {homeCb === 0 && awayCb === 0 && (
            <p className="flex items-center gap-1.5 text-dim">
              <Minus size={14} /> Level game — no comeback trail live
            </p>
          )}
        </div>
      </div>

      {/* Away-Day Kit cross-link */}
      <a
        href="https://jumesim.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mx-3.5 mb-3.5 mt-3 flex items-center gap-3 rounded-lg bg-accent2/10 p-3 ring-1 ring-accent2/30"
      >
        <Plane size={18} className="shrink-0 text-accent2" />
        <div className="flex-1">
          <p className="text-[12px] font-extrabold text-white">Away-Day Kit</p>
          <p className="text-[11px] text-dim">Traveling? Data from $2.99 → jumesim.com</p>
        </div>
        <span className="text-[11px] font-bold text-accent2">OPEN</span>
      </a>
    </section>
  );
}
