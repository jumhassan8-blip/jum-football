"use client";

import { useMemo } from "react";
import { Crown } from "lucide-react";
import { fansSeed } from "@/lib/api";
import { useFanPoints } from "@/lib/store";
import { useT } from "@/lib/i18n";

/** Fans leaderboard — seeded fans merged with "You" (points from chat/likes/votes). */
export default function FansBoard() {
  const t = useT();
  const mine = useFanPoints();
  const rows = useMemo(() => {
    const all = [...fansSeed().map((f) => ({ ...f, me: false })), { name: "You", points: mine, color: "#C8FF3D", me: true }];
    return all.sort((a, b) => b.points - a.points).slice(0, 9);
  }, [mine]);
  const topScore = rows[0]?.points ?? 1;

  return (
    <section className="rounded-card bg-card">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <h3 className="text-[13px] font-extrabold">{t("fans.leaderboard")}</h3>
        <span className="text-[10px] font-bold text-dim">points from comments & activity</span>
      </div>
      <div className="divide-y divide-divider">
        {rows.map((f, i) => {
          const superFan = f.points >= 500;
          return (
            <div key={f.name} className={`flex items-center gap-3 px-4 py-2.5 ${f.me ? "bg-accent/[0.06]" : ""}`}>
              <span className={`w-5 text-center text-[12px] font-black ${i === 0 ? "text-gold" : "text-dim"}`}>
                {i === 0 ? <Crown size={14} className="inline text-gold" /> : i + 1}
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black"
                style={{ backgroundColor: `${f.color}22`, color: f.color, border: `1.5px solid ${f.color}` }}
              >
                {f.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="flex-1">
                <p className="text-[12px] font-bold">
                  {f.name}
                  {f.me && <span className="ml-1.5 text-[9px] font-black text-accent">YOU</span>}
                  {superFan && (
                    <span className="ml-1.5 rounded bg-gold/15 px-1.5 py-0.5 text-[8px] font-black text-gold">{t("fans.superFan")}</span>
                  )}
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/50">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, Math.round((f.points / topScore) * 100))}%`, backgroundColor: f.color }}
                  />
                </div>
              </div>
              <span className="text-[12px] font-black tabular-nums text-white">{f.points.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
