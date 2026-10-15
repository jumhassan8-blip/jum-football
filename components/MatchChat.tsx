"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Send, Share2, MessageCircle } from "lucide-react";
import type { ChatComment, ChatReply } from "@/lib/lifestyleData";
import { MOCK_COMMENTS } from "@/lib/lifestyleData";
import { useT } from "@/lib/i18n";
import JumAd from "@/components/JumAd";
import FanAvatar from "@/components/FanAvatar";

const COINS_KEY = "jumCoins";
const LIKED_KEY = "jumMatchLiked";
const POLL_KEY = "jumPollVote";
const FLOAT_EMOJIS = ["🔥", "❤️", "😱", "😂", "😡"];

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
  window.dispatchEvent(new Event("jum-store-change"));
}

async function miniConfetti() {
  const mod = await import("canvas-confetti");
  mod.default({ particleCount: 24, spread: 50, origin: { y: 0.8 }, scalar: 0.7, colors: ["#FF4D4D", "#B4FF39"] });
}

export default function MatchChat({ matchId = 1, home = "Galatasaray", away = "Fenerbahce" }: { matchId?: number; home?: string; away?: string }) {
  const t = useT();
  const [coins, setCoins] = useState(340);
  const [liked, setLiked] = useState(false);
  const [sort, setSort] = useState<"Top" | "Latest">("Top");
  // §4: fabricated seed comments render only in development; production
  // starts from the real store (empty until someone comments).
  const [comments, setComments] = useState<ChatComment[]>(
    process.env.NODE_ENV === "development" ? MOCK_COMMENTS : []
  );
  const [draft, setDraft] = useState("");
  const [coinFloat, setCoinFloat] = useState<number | null>(null);
  const [burst, setBurst] = useState<{ id: number; commentId: number } | null>(null);
  const [vote, setVote] = useState<"home" | "away" | null>(null);
  const [goalToast, setGoalToast] = useState(false);

  // persisted state
  useEffect(() => {
    setCoins(readJSON(COINS_KEY, 340));
    setLiked(readJSON(LIKED_KEY, false));
    setVote(readJSON(POLL_KEY, null));
  }, []);

  // goal toast at 5s
  useEffect(() => {
    const t = setTimeout(() => setGoalToast(true), 5000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!goalToast) return;
    const t = setTimeout(() => setGoalToast(false), 4000);
    return () => clearTimeout(t);
  }, [goalToast]);

  // long-press → floating emojis
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = (commentId: number) => {
    pressTimer.current = setTimeout(() => setBurst({ id: Date.now(), commentId }), 550);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const addCoins = (n: number) => {
    setCoins((c) => {
      const next = c + n;
      writeJSON(COINS_KEY, next);
      return next;
    });
  };

  const likeMatch = () => {
    const next = !liked;
    setLiked(next);
    writeJSON(LIKED_KEY, next);
    if (next) miniConfetti();
  };

  const castVote = (v: "home" | "away") => {
    if (vote) return;
    setVote(v);
    writeJSON(POLL_KEY, v);
    addCoins(3);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const me: ChatComment = {
      id: Date.now(),
      user: "You",
      avatar: "local://avatar/me",
      badge: null,
      text,
      time: "now",
      likes: 0,
      liked: false,
      replies: [],
    };
    setComments((c) => [me, ...c]);
    setDraft("");
    addCoins(10);
    setCoinFloat(Date.now());
  };

  const toggleLikeComment = (id: number, isReply: boolean, parentId?: number) => {
    setComments((cs) =>
      cs.map((c) => {
        if (!isReply && c.id === id) {
          return { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) };
        }
        if (isReply && c.id === parentId) {
          return {
            ...c,
            replies: c.replies.map((r: ChatReply) =>
              r.id === id ? { ...r, liked: !r.liked, likes: r.likes + (r.liked ? -1 : 1) } : r
            ),
          };
        }
        return c;
      })
    );
  };

  const sorted = sort === "Top" ? [...comments].sort((a, b) => b.likes - a.likes) : comments;

  const renderActions = (id: number, likes: number, isLiked: boolean, isReply = false, parentId?: number) => (
    <div className="mt-1.5 flex items-center gap-3">
      <button
        onClick={() => toggleLikeComment(id, isReply, parentId)}
        className={`flex items-center gap-1 text-[10px] font-bold ${isLiked ? "text-[#FF4D4D]" : "text-[#888888]"}`}
      >
        <Heart size={11} fill={isLiked ? "currentColor" : "none"} /> {likes}
      </button>
      <button className="flex items-center gap-1 text-[10px] font-bold text-[#888888]">
        <MessageCircle size={11} /> Reply
      </button>
      <button className="flex items-center gap-1 text-[10px] font-bold text-[#888888]">
        <Share2 size={11} /> Share
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* streak banner + coins */}
      <div className="flex items-start gap-2">
        <div className="flex-1 rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/20 to-red-500/20 p-3 text-xs text-white/90">
          🔥 <span className="font-black">7 Day Streak</span> — come back tomorrow for 50 Coins
        </div>
        <div className="relative rounded-xl border bg-[#15151A] px-3 py-2 text-xs font-bold text-[#FFD34D]" style={{ borderColor: "#222228" }}>
          🪙 {coins.toLocaleString()}
          <AnimatePresence>
            {coinFloat && (
              <motion.span
                key={coinFloat}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -22 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                onAnimationComplete={() => setCoinFloat(null)}
                className="absolute -top-1 right-0 text-[10px] font-black text-[#FFD34D]"
              >
                +10 🪙
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* header row */}
      <div className="flex items-center gap-2">
        <button onClick={likeMatch} className="flex items-center gap-1.5 text-[12px] font-bold">
          <motion.span animate={{ scale: liked ? [1, 1.5, 1] : 1 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
            <Heart size={16} fill={liked ? "#FF4D4D" : "none"} className={liked ? "text-[#FF4D4D]" : "text-[#AAAAAA]"} />
          </motion.span>
          12.4k
        </button>
        <div className="ml-auto flex gap-1">
          {(["Top", "Latest"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${
                sort === s ? "bg-[#B4FF39] font-bold text-black" : "bg-[#15151A] text-[#888888]"
              }`}
            >
              {s === "Top" ? t("match.top") : t("match.latest")}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-bold text-[#AAAAAA]">
          {t("match.comments", { count: 342 + matchId })} <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#FF4D4D]" /> {t("common.live")}
        </span>
      </div>

      {/* input row */}
      <div className="flex items-center gap-2">
        <FanAvatar name="You" size={36} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("match.chatPlaceholder")}
          className="min-h-[44px] flex-1 rounded-full border bg-[#15151A] px-4 py-3 text-[12px] outline-none placeholder:text-[#888888]"
          style={{ borderColor: "#222228" }}
        />
        <button aria-label="Add emoji" className="text-lg">😀</button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={send}
          aria-label="Send comment"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B4FF39] text-black"
        >
          <Send size={16} />
        </motion.button>
      </div>

      {/* poll card */}
      <section className="rounded-2xl border bg-[#15151A] p-4" style={{ borderColor: "#222228" }}>
        <h4 className="text-[13px] font-extrabold">{t("match.whoWillWin")}</h4>
        <div className="mt-2.5 space-y-2">
          {([
            { key: "home" as const, label: `${home} 58%`, pct: 58, cls: "bg-[#B4FF39] text-black font-bold" },
            { key: "away" as const, label: `${away} 42%`, pct: 42, cls: "bg-[#2A2A32] text-[#AAAAAA]" },
          ]).map((o) => (
            <button key={o.key} onClick={() => castVote(o.key)} className="relative h-8 w-full overflow-hidden rounded-full bg-black/40 text-left">
              <motion.span
                initial={{ width: vote ? `${o.pct}%` : "0%" }}
                animate={{ width: `${o.pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`absolute inset-y-0 left-0 flex items-center rounded-full px-3 text-[11px] ${o.cls} ${
                  vote && vote !== o.key ? "opacity-40" : ""
                }`}
              >
                {o.label}
              </motion.span>
              {!vote && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#AAAAAA]">Tap to vote</span>}
            </button>
          ))}
        </div>
        {vote && <p className="mt-1.5 text-[10px] text-[#888888]">Vote locked — one per fan · +3 🪙</p>}
      </section>

      {/* comments */}
      {sorted.map((c, i) => (
        <div key={c.id}>
          <div
            className="relative"
            onPointerDown={() => startPress(c.id)}
            onPointerUp={endPress}
            onPointerLeave={endPress}
          >
            {burst?.commentId === c.id && (
              <div className="pointer-events-none absolute left-8 top-0 z-10">
                {FLOAT_EMOJIS.map((e, j) => (
                  <motion.span
                    key={`${burst.id}-${j}`}
                    initial={{ opacity: 1, y: 0, x: 0 }}
                    animate={{ opacity: 0, y: -46 - j * 12, x: (j - 2) * 14 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    onAnimationComplete={() => setBurst(null)}
                    className="absolute text-[15px]"
                  >
                    {e}
                  </motion.span>
                ))}
              </div>
            )}
            <div className="flex gap-2.5">
              <FanAvatar name={c.user} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold">
                  {c.user}
                  {c.badge && (
                    <span className="ml-1.5 rounded-full bg-[#B4FF39] px-1.5 py-px text-[9px] font-black text-black">{c.badge}</span>
                  )}
                  <span className="ml-1.5 text-[10px] font-normal text-[#888888]">{c.time}</span>
                </p>
                <p className="mt-0.5 text-[13px] text-white/90">{c.text}</p>
                {renderActions(c.id, c.likes, c.liked)}
              </div>
            </div>
            {c.replies.map((r) => (
              <div key={r.id} className="ml-4 mt-2 flex gap-2.5 border-l border-[#222228] pl-3">
                <FanAvatar name={r.user} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold">
                    {r.user}
                    {r.badge && <span className="ml-1.5 rounded-full bg-[#B4FF39] px-1.5 py-px text-[8px] font-black text-black">{r.badge}</span>}
                    <span className="ml-1.5 text-[10px] font-normal text-[#888888]">{r.time}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/90">{r.text}</p>
                  {renderActions(r.id, r.likes, r.liked, true, c.id)}
                </div>
              </div>
            ))}
          </div>
          {/* native ad after every 6th comment */}
          {(i + 1) % 6 === 0 && (
            <div className="pt-3">
              <JumAd type="native" />
            </div>
          )}
        </div>
      ))}

      {/* goal toast */}
      <AnimatePresence>
        {goalToast && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
          >
            <p className="whitespace-nowrap rounded-full border border-[#B4FF39]/40 bg-[#15151A] px-4 py-2 text-xs font-bold">
              ⚽ GOAL! {home} 2-1 — Icardi 78&prime;
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
