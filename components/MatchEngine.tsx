"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Info, Shirt } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MockMatch } from "@/lib/lifestyleData";
import { useT } from "@/lib/i18n";

const RAFFLE_TOTAL_SECONDS = 2 * 3600 + 14 * 60 + 33; // 02:14:33
const JOINED_KEY = "jumRaffleJoined";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function confettiBurst() {
  const mod = await import("canvas-confetti");
  const fire = mod.default;
  fire({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors: ["#B4FF39", "#FFFFFF", "#FF4D4D"] });
  setTimeout(() => fire({ particleCount: 45, spread: 100, origin: { y: 0.6 }, colors: ["#B4FF39"] }), 180);
}

export default function MatchEngine({ match }: { match: MockMatch }) {
  // A) MOMENTUM WAVE ─────────────────────────────────────────
  const probs = useMemo(() => {
    const h = match.momentum.length
      ? Math.round(match.momentum.reduce((s, p) => s + p.h, 0) / match.momentum.length)
      : 50;
    const a = match.momentum.length
      ? Math.round(match.momentum.reduce((s, p) => s + p.a, 0) / match.momentum.length)
      : 50;
    const draw = Math.max(4, 100 - h - a);
    const scale = 100 - draw;
    const home = Math.round((h / (h + a)) * scale);
    return { home, draw, away: 100 - draw - home };
  }, [match.momentum]);

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border bg-[#15151A] p-4" style={{ borderColor: "#222228" }}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[13px] font-extrabold">JUM Pressure Index</h3>
          <Info size={14} className="text-[#888888]" />
        </div>
        <div className="h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={match.momentum} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222228" vertical={false} />
              <XAxis
                dataKey="m"
                tick={{ fill: "#888888", fontSize: 10 }}
                stroke="#222228"
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#15151A", border: "1px solid #222228", borderRadius: 10, fontSize: 11 }}
                labelFormatter={(m) => `${m}'`}
              />
              <Area type="monotone" dataKey="h" stroke="#B4FF39" fill="#B4FF39" fillOpacity={0.6} strokeWidth={2} isAnimationActive={false} name={match.home} />
              <Area type="monotone" dataKey="a" stroke="#FF4D4D" fill="#FF4D4D" fillOpacity={0.4} strokeWidth={2} isAnimationActive={false} name={match.away} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* pulsing live dot at current minute */}
        <div className="relative mt-1 h-1.5">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#222228]" />
          <span
            className="pulse-dot absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#B4FF39]"
            style={{ left: `${Math.min(98, (match.minute / 90) * 100)}%` }}
          />
        </div>
        {/* stats row */}
        <div className="mt-2.5 space-y-1.5">
          {[
            { label: "Home", pct: probs.home, color: "#B4FF39" },
            { label: "Draw", pct: probs.draw, color: "#888888" },
            { label: "Away", pct: probs.away, color: "#FF4D4D" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-10 text-[10px] font-bold" style={{ color: s.color }}>{s.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/60">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
              </div>
              <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[#AAAAAA]">{s.pct}%</span>
            </div>
          ))}
        </div>
      </section>

      <RaffleCard match={match} />
    </div>
  );
}

// B) RAFFLE CARD ─────────────────────────────────────────────
function RaffleCard({ match }: { match: MockMatch }) {
  const t = useT();
  const [countdown, setCountdown] = useState(RAFFLE_TOTAL_SECONDS);
  const [joined, setJoined] = useState(false);
  const [pick, setPick] = useState<"home" | "draw" | "away">("home");
  const [homeScore, setHomeScore] = useState(2);
  const [awayScore, setAwayScore] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setJoined(readJSON(JOINED_KEY, false));
    const iv = setInterval(() => setCountdown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2400);
  };

  const join = async () => {
    writeJSON(JOINED_KEY, true);
    setJoined(true);
    await confettiBurst();
    showToast("You joined! Good luck 🍀");
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
  };

  const winnerVisible = match.minute > 85;

  return (
    <section
      className="rounded-2xl border border-[#B4FF39]/30 bg-gradient-to-b from-[#B4FF39]/20 to-[#15151A] p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-black">🔥 JUM RAFFLE</p>
        <span className="pulse-dot rounded-full bg-[#FF4D4D]/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-[#FF4D4D]">
          {fmt(countdown)}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-[#AAAAAA]">2,431 joined</p>

      {/* prize row */}
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/30 p-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#B4FF39]/15 text-[#B4FF39]">
          <Shirt size={24} />
        </span>
        <div>
          <p className="text-[14px] font-extrabold">Win Official Jersey</p>
          <p className="text-[12px] font-bold text-[#B4FF39]">$120</p>
        </div>
      </div>

      {!winnerVisible ? (
        joined ? (
          <p className="mt-3 rounded-full bg-[#B4FF39]/10 py-2.5 text-center text-[12px] font-black text-[#B4FF39]">
            ✓ Joined — prediction {pick === "home" ? match.home : pick === "away" ? match.away : "Draw"} {homeScore}-{awayScore}
          </p>
        ) : (
          <>
            {/* prediction pills */}
            <div className="mt-3 flex gap-2">
              {([
                { key: "home" as const, label: match.home },
                { key: "draw" as const, label: "Draw" },
                { key: "away" as const, label: match.away },
              ]).map((o) => (
                <button
                  key={o.key}
                  onClick={() => setPick(o.key)}
                  className={`flex-1 rounded-full py-2 text-[11px] font-bold transition ${
                    pick === o.key ? "bg-[#B4FF39] font-bold text-black" : "bg-black/40 text-[#AAAAAA]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {/* score inputs */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <input
                type="number"
                min={0}
                max={20}
                value={homeScore}
                onChange={(e) => setHomeScore(Math.max(0, Number(e.target.value) || 0))}
                aria-label={t("a11y.homeScore")}
                className="h-10 w-12 rounded-lg border border-[#222228] bg-black text-center text-[14px] font-black outline-none focus:border-[#B4FF39]"
              />
              <span className="text-[14px] font-black text-[#888888]">-</span>
              <input
                type="number"
                min={0}
                max={20}
                value={awayScore}
                onChange={(e) => setAwayScore(Math.max(0, Number(e.target.value) || 0))}
                aria-label={t("a11y.awayScore")}
                className="h-10 w-12 rounded-lg border border-[#222228] bg-black text-center text-[14px] font-black outline-none focus:border-[#B4FF39]"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={join}
              className="mt-3 w-full rounded-full bg-[#B4FF39] py-3 text-[13px] font-black text-black"
            >
              Join Raffle — Free
            </motion.button>
          </>
        )
      ) : (
        <p className="mt-3 rounded-xl bg-black/30 p-3 text-center text-[13px] font-bold">
          🏆 Winner: <span className="text-[#B4FF39]">Ahmed M. 2-1</span>
        </p>
      )}

      {/* toast */}
      {toast && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-full bg-[#B4FF39]/15 py-2 text-center text-[11px] font-bold text-[#B4FF39]"
        >
          {toast}
        </motion.p>
      )}
    </section>
  );
}
