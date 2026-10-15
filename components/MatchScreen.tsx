"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { MockMatch } from "../lib/lifestyleData";
import TeamLogo from "./TeamLogo";
import MatchEngine from "./MatchEngine";
import MatchChat from "./MatchChat";
import RefMatchChip from "./RefMatchChip";
import JumAd from "./JumAd";
import FloatNav from "./FloatNav";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { joinPresence, useViewerCount } from "@/lib/presence";

/** Crest goes through TeamLogo — the only logo renderer in the app. */
function Crest({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-white" style={{ width: size, height: size }}>
      <TeamLogo team={{ name, logo: src }} size={size - 6} />
    </span>
  );
}

/* Prediction poll — Who will win? One vote, persisted per match */
type PollPick = "home" | "draw" | "away";

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

function PredictionPoll({ match }: { match: MockMatch }) {
  const t = useT();
  const key = `jum-pred-${match.id}`;
  const [vote, setVote] = useState<PollPick | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setVote(readJSON<PollPick>(key));
  }, [key]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const base = { home: 41, draw: 9, away: 50 };
  const cast = (p: PollPick) => {
    if (vote) return;
    setVote(p);
    writeJSON(key, p);
    setToast(t("match.predictionLocked"));
  };

  const total = base.home + base.draw + base.away + (vote ? 1 : 0);
  const options: { p: PollPick; label: string; n: number; color: string }[] = [
    { p: "home", label: match.home, n: base.home + (vote === "home" ? 1 : 0), color: "#B4FF39" },
    { p: "draw", label: t("match.draw"), n: base.draw + (vote === "draw" ? 1 : 0), color: "#888888" },
    { p: "away", label: match.away, n: base.away + (vote === "away" ? 1 : 0), color: "#FF4D4D" },
  ];

  return (
    <div className="rounded-2xl border border-[#222228] bg-[#15151A] p-4 mx-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-black text-white">{t("match.whoWillWin")}</p>
        <span className="text-[10px] font-bold text-[#888888]">{t("match.predictions", { count: total })}</span>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const pct = Math.round((o.n / total) * 100);
          return (
            <motion.button
              key={o.p}
              whileTap={{ scale: 0.98 }}
              onClick={() => cast(o.p)}
              className="relative overflow-hidden rounded-lg border border-[#222228] px-3 py-2.5 text-left"
            >
              <motion.span
                className="absolute inset-y-0 left-0"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                style={{ backgroundColor: o.color, color: "#000" }}
              />
              <span className="relative z-10 flex items-center justify-between text-[12px] font-black text-white">
                <span>{o.label}</span>
                <span>{pct}%</span>
              </span>
            </motion.button>
          );
        })}
      </div>
      {vote && <p className="text-[10px] font-bold text-[#888888] mt-2.5">{t("match.youPicked", { team: options.find((o) => o.p === vote)?.label ?? "" })}</p>}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[70] px-4 py-2 rounded-full bg-[#B4FF39] text-black text-[12px] font-black shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function ScoreboardSkeleton() {
  return (
    <div className="max-w-[480px] mx-auto px-4 pt-5">
      <div className="rounded-2xl border border-[#222228] bg-[#15151A] p-5 animate-pulse">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <div className="w-[52px] h-[52px] rounded-full bg-[#222228]" />
            <div className="h-3 w-16 rounded bg-[#222228]" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-9 w-24 rounded-xl bg-[#222228]" />
            <div className="h-3 w-14 rounded bg-[#222228]" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-[52px] h-[52px] rounded-full bg-[#222228]" />
            <div className="h-3 w-16 rounded bg-[#222228]" />
          </div>
        </div>
        <div className="mt-4 h-3 w-40 rounded bg-[#222228] mx-auto" />
      </div>
      <div className="mt-4 mx-4 h-40 rounded-2xl bg-[#15151A] border border-[#222228]" />
    </div>
  );
}

export default function MatchScreen({ match }: { match: MockMatch }) {
  const router = useRouter();
  const t = useT();
  const [ready, setReady] = useState(false);
  const { user } = useAuth();
  // presence keys on the ROUTE id (not match.id) so the count matches the
  // /live card that opened this screen — including API-mapped ids
  const [routeId, setRouteId] = useState<string>(String(match.id));
  const viewers = useViewerCount(routeId);

  useEffect(() => {
    const id = window.location.pathname.split("/")[2];
    if (id) setRouteId(id);
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let leave: (() => Promise<void>) | undefined;
    let cancelled = false;
    void joinPresence(routeId, uid).then((l) => {
      if (cancelled) void l();
      else leave = l;
    });
    return () => {
      cancelled = true;
      void leave?.();
    };
  }, [user?.uid, routeId]);

  if (!ready) {
    return (
      <div className="relative min-h-screen bg-[#070709] pb-32">
        <div className="sticky top-0 z-50 bg-[#070709]/90 backdrop-blur border-b border-[#222228]">
          <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-[#1A1A20] border border-[#222228] animate-pulse" />
            <div className="h-4 w-28 rounded bg-[#222228] animate-pulse" />
            <div className="w-10" />
          </div>
        </div>
        <ScoreboardSkeleton />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070709] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#070709]/90 backdrop-blur border-b border-[#222228]">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.sessionStorage.getItem("jum-live-scroll") !== null) router.back();
              else router.push("/live/");
            }}
            className="w-10 h-10 grid place-items-center rounded-full bg-[#1A1A20] border border-[#222228] text-white"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D4D] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF4D4D]" />
            </span>
            <p className="text-[13px] font-black text-white tracking-[0.12em]">{t("match.liveMatch")}</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Scoreboard */}
      <div className="max-w-[480px] mx-auto px-4 pt-5">
        <div className="rounded-2xl border border-[#222228] bg-[#15151A] p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <Crest name={match.home} src={match.homeCrest || undefined} size={52} />
              <p className="text-[11px] font-black text-white text-center leading-tight">{match.home}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="px-4 py-2 rounded-xl bg-black border border-[#222228]">
                <p className="text-[18px] font-black text-white leading-none">
                  {match.homeScore} - {match.awayScore}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D4D] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF4D4D]" />
                </span>
                <span className="text-[11px] font-black text-[#FF4D4D]">{match.minute}&prime; LIVE</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Crest name={match.away} src={match.awayCrest || undefined} size={52} />
              <p className="text-[11px] font-black text-white text-center leading-tight">{match.away}</p>
            </div>
          </div>
          {match.scorers && (
            <div className="mt-4 pt-3 border-t border-[#222228] text-center">
              <p className="text-[10px] font-bold text-[#888888] leading-relaxed">{match.scorers}</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-[#222228] text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-[#AAAAAA] ring-1 ring-[#222228]">
              👁 {viewers} {t("watch.viewersLabel")}
            </span>
            <div className="mt-0.5">
              <RefMatchChip routeId={routeId} />
            </div>
          </div>
        </div>
      </div>

      {/* Momentum + raffle */}
      <div className="mt-4">
        <MatchEngine match={match} />
      </div>

      {/* Prediction poll */}
      <PredictionPoll match={match} />

      {/* Native ad — first ad on the match page sits BELOW the
          momentum graph (MatchEngine above), never above the score header.
          Placement map forbids top + mobileSticky on /match/[id] in code. */}
      <div className="mt-4">
        <JumAd type="native" />
      </div>

      {/* Chat + events timeline */}
      <MatchChat matchId={match.id} home={match.home} away={match.away} />

      {/* second infeed — after the events/chat timeline */}
      <JumAd type="native" />

      {/* Sticky ad: rendered inside the page container so its reserved
          height matches content flow; fixed layer stays at z-40 under
          both the score bug (z-50) and the bottom nav (z-50) */}
      <div className="h-[50px]" aria-hidden={false}>
        <JumAd type="sticky" />
      </div>
      <FloatNav active="Live" />
    </div>
  );
}
