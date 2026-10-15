"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Match, Team } from "@/lib/jumMock";

/**
 * Momentum graph 0–90': lime = home pressure, red = away pressure.
 * Series is derived from the match's event stream + final momentum lean,
 * and the insight line reads the last-10-minute window.
 */
export default function MomentumChart({ match, home, away }: { match: Match; home: Team; away: Team }) {
  const { data, insight } = useMemo(() => {
    const endMinute = match.minute ?? 90;
    // walk events to build a plausible pressure curve
    let h = 42;
    let a = 40;
    const pts: { min: number; home: number; away: number }[] = [];
    const events = [...(match.events ?? [])].sort((x, y) => x.minute - y.minute);
    for (let m = 0; m <= 90; m += 3) {
      const drift = ((match.momentum ?? 0) / 100) * 0.35;
      h = Math.max(12, Math.min(92, h + drift + Math.sin(m / 9) * 2.2 + (Math.random() - 0.5) * 3));
      a = Math.max(12, Math.min(92, a - drift + Math.cos(m / 11) * 2.2 + (Math.random() - 0.5) * 3));
      for (const e of events) {
        if (e.minute > m - 3 && e.minute <= m) {
          if (e.type === "goal") {
            if (e.side === "home") h = Math.min(95, h + 22);
            else a = Math.min(95, a + 22);
          } else if (e.type === "red") {
            if (e.side === "home") h = Math.max(10, h - 14);
            else a = Math.max(10, a - 14);
          } else {
            if (e.side === "home") h = Math.min(92, h + 6);
            else a = Math.min(92, a + 6);
          }
        }
      }
      if (m <= Math.max(endMinute, 15)) {
        // guarantee visual separation so both teams always read on the chart
        if (Math.abs(h - a) < 16) {
          const mid = (h + a) / 2;
          const lead = (match.momentum ?? 0) >= 0 ? 1 : -1;
          h = mid + 8 * lead;
          a = mid - 8 * lead;
        }
        pts.push({ min: m, home: Math.round(h), away: Math.round(a) });
      }
    }
    const windowPts = pts.filter((p) => p.min >= Math.max(0, endMinute - 10));
    const homeAvg = windowPts.reduce((s, p) => s + p.home, 0) / (windowPts.length || 1);
    const awayAvg = windowPts.reduce((s, p) => s + p.away, 0) / (windowPts.length || 1);
    const leader = homeAvg >= awayAvg ? home.short : away.short;
    const pct = Math.round((Math.max(homeAvg, awayAvg) / (homeAvg + awayAvg)) * 100);
    return {
      data: pts,
      insight: `Last 10 min: ${pct}% pressure ${leader} — goal likely`,
    };
  }, [match, home.short, away.short]);

  return (
    <section className="rounded-card bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[13px] font-extrabold">Momentum</h3>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: home.color }} />
            {home.short}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: away.color }} />
            {away.short}
          </span>
        </div>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#232A33" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="min" tick={{ fill: "#9AA3AF", fontSize: 9 }} tickCount={7} stroke="#232A33" />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "#151A21", border: "1px solid #232A33", borderRadius: 10, fontSize: 11 }}
              labelFormatter={(m) => `${m}'`}
            />
            <Area type="monotone" dataKey="away" stroke="#FF5C8A" fill="#FF5C8A" fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} name={away.short} />
            <Area type="monotone" dataKey="home" stroke="#C8FF3D" fill="#C8FF3D" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} name={home.short} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-accent/[0.07] px-2.5 py-1.5 text-[11px] font-bold text-accent">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
        {insight}
      </p>
    </section>
  );
}
