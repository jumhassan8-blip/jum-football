"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Crown, X, Zap, RotateCw, Maximize, Share2, Settings,
  PictureInPicture2, Heart, Send, ChevronRight, Lock, BarChart3,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { LiveMatch } from "@/lib/leaguesData";
import { COMMENTARY } from "@/lib/leaguesData";
import AdBanner from "@/components/AdBanner";
import FanAvatar from "@/components/FanAvatar";
import TeamLogo from "@/components/TeamLogo";
import BottomNav from "@/components/BottomNav";
import { useT } from "@/lib/i18n";
import { usePro } from "@/lib/usePro";
import { joinPresence, useViewerCount } from "@/lib/presence";

/* ═══ monetization tuning — adjust ad frequency in ONE place ═══ */
export const AD_INTERVAL_SECONDS = 1200; // free tier: exact 20:00 between ad breaks
const INTERSTITIAL_SECONDS = 15;
const SKIP_AFTER_SECONDS = 5;
const UPSELL_AFTER_SECONDS = 60;
const CONTROLS_HIDE_MS = 3000;

const COINS_KEY = "jumCoins";

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

function useIsPro() {
  return usePro();
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 55%)`;
}
/** ClubLogo delegates to TeamLogo — the only logo renderer in the app. */
function ClubLogo({ name, logo, size = 30 }: { name: string; logo: string; size?: number }) {
  const color = hashColor(name);
  return (
    <TeamLogo
      team={{ name, logo }}
      size={size}
      color={`${color}22`}
      fg={color}
      ring={color}
    />
  );
}

/* ═══ live chat — real multi-user via Firestore ═══ */
import {
  subscribeChat, sendChatComment, sendChatReply, toggleChatLike,
  addChatReaction, reportChatComment, loadEarlierChat,
  MAX_CHAT_CHARS, CHAT_THROTTLE_MS, type ChatMsg,
} from "@/lib/chatStore";
import { isDemoMode } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const EMOJI_BURST = ["❤️", "🔥", "😂", "👏", "⚽"];

function chatTime(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  return `${Math.floor(d / 3_600_000)}h`;
}

function WatchChat({ matchId, standalone = false }: { matchId: number; standalone?: boolean }) {
  const t = useT();
  const { user } = useAuth();
  const uid = user?.uid ?? "anon";
  const [myName] = useState(() => {
    const saved = readJSON<string | null>("jum-chat-name", null);
    if (saved) return saved;
    const n = `Fan-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    writeJSON("jum-chat-name", n);
    return n;
  });
  const [comments, setComments] = useState<ChatMsg[]>([]);
  const [earlier, setEarlier] = useState<ChatMsg[]>([]);
  const [hasMoreEarlier, setHasMoreEarlier] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [burst, setBurst] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [coins, setCoins] = useState(340);
  const [coinFloat, setCoinFloat] = useState(0);
  const lastPostAt = useRef(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCoins(readJSON(COINS_KEY, 340));
  }, []);

  // real-time listener — detaches while the tab is hidden (guard + battery)
  useEffect(() => {
    let detach: (() => void) | undefined;
    let disposed = false;
    void subscribeChat(matchId, (items) => {
      if (!disposed) setComments(items);
    }).then((un) => {
      if (disposed) un();
      else detach = un;
    });
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        detach?.();
        detach = undefined;
      } else if (!detach) {
        void subscribeChat(matchId, (items) => !disposed && setComments(items)).then((un) => {
          if (disposed) un();
          else detach = un;
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      detach?.();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [matchId]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    // guards: 280-char max, 1 comment per 5s per uid
    if (text.length > MAX_CHAT_CHARS) {
      showNotice(`${MAX_CHAT_CHARS} max`);
      return;
    }
    if (Date.now() - lastPostAt.current < CHAT_THROTTLE_MS) {
      showNotice("Slow down — one comment per 5s");
      return;
    }
    lastPostAt.current = Date.now();
    setDraft("");
    setReplyTo(null);
    try {
      if (replyTo) await sendChatReply(matchId, replyTo.id, uid, myName, text);
      else await sendChatComment(matchId, uid, myName, text);
      const next = coins + 10;
      setCoins(next);
      writeJSON(COINS_KEY, next);
      setCoinFloat(Date.now());
    } catch {
      showNotice("Message failed — try again");
    }
  };

  const react = async (c: ChatMsg, emoji: string) => {
    setPickerFor(null);
    try {
      await addChatReaction(matchId, c.id, uid, emoji);
    } catch { /* offline */ }
  };

  const report = async (c: ChatMsg) => {
    try {
      await reportChatComment(matchId, c, uid);
      showNotice(t("chat.reported"));
    } catch { /* offline */ }
  };

  const loadEarlier = async () => {
    const oldest = comments[0]?.createdAt ?? Date.now();
    const page = await loadEarlierChat(matchId, oldest);
    if (page.length) {
      setEarlier((p) => [...page.filter((m) => !p.some((x) => x.id === m.id)), ...p]);
      setHasMoreEarlier(page.length >= 200);
    } else {
      setHasMoreEarlier(false);
    }
  };

  const pressStart = (c: ChatMsg, e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pressTimer.current = setTimeout(() => {
      setBurst({ id: c.id, x, y });
      setPickerFor(c.id);
    }, 450);
  };
  const pressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const all = [...earlier, ...comments];
  const liked = (c: ChatMsg) => c.likes.includes(uid);
  const viewers = useViewerCount(String(matchId)); // real presence count, 0 when unavailable

  return (
    <div className={standalone ? "flex h-full min-h-0 flex-col" : "rounded-2xl border border-[#222228] bg-[#15151A] p-3.5"}>
      {/* header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-extrabold text-white">{t("watch.liveChat")}</h3>
        <div className="flex items-center gap-2">
          {isDemoMode() && (
            <span className="rounded-full bg-white/5 px-1.5 py-px text-[8px] font-black text-[#888888] ring-1 ring-white/10">
              {t("chat.demo")}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#FFD34D]">
            🪙 <span className="tabular-nums">{coins}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#888888]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#FF4D4D]" />
            👁 {viewers} {t("watch.viewersLabel")}
          </span>
        </div>
      </div>

      {notice && (
        <p className="mb-2 rounded-lg bg-[#B4FF39]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#B4FF39]">{notice}</p>
      )}

      {/* comments */}
      <div className={standalone ? "min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" : "max-h-[420px] space-y-3 overflow-y-auto pr-1"}>
        {hasMoreEarlier && all.length > 0 && (
          <button onClick={() => void loadEarlier()} className="w-full rounded-lg bg-white/5 py-1.5 text-[10px] font-bold text-[#888888] transition hover:text-white">
            ↑ {t("chat.loadEarlier")}
          </button>
        )}
        <AnimatePresence initial={false}>
          {all.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative">
              <div
                onPointerDown={(e) => pressStart(c, e)}
                onPointerUp={pressEnd}
                onPointerLeave={pressEnd}
                className="flex gap-2"
              >
                <FanAvatar name={c.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-white">{c.name}</span>
                    {c.uid === uid && (
                      <span className="rounded-full bg-[#B4FF39]/15 px-1.5 py-px text-[8px] font-black text-[#B4FF39] ring-1 ring-[#B4FF39]/40">YOU</span>
                    )}
                    <span className="text-[9px] font-bold text-[#888888]">{chatTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-white/90">{c.text}</p>
                  {/* reactions row */}
                  {Object.entries(c.reactions).filter(([, u]) => (u as string[]).length > 0).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(c.reactions)
                        .filter(([, u]) => (u as string[]).length > 0)
                        .map(([emoji, u]) => (
                          <button
                            key={emoji}
                            onClick={() => void react(c, emoji)}
                            className={`rounded-full px-1.5 py-px text-[10px] font-bold ring-1 ${
                              (u as string[]).includes(uid)
                                ? "bg-[#B4FF39]/15 text-[#B4FF39] ring-[#B4FF39]/40"
                                : "bg-white/5 text-white/70 ring-white/10"
                            }`}
                          >
                            {emoji} {(u as string[]).length}
                          </button>
                        ))}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      onClick={() => void toggleChatLike(matchId, c.id, uid, liked(c))}
                      aria-label={`Like comment by ${c.name}`}
                      className={`flex items-center gap-1 text-[11px] font-bold transition ${liked(c) ? "text-[#FF4D4D]" : "text-[#888888]"}`}
                    >
                      <Heart size={12} fill={liked(c) ? "#FF4D4D" : "none"} />
                      <span className="tabular-nums">{c.likes.length}</span>
                    </button>
                    <button onClick={() => setReplyTo(c)} className="text-[11px] font-bold text-[#888888] transition hover:text-white">
                      {t("common.reply")}
                    </button>
                    <button onClick={() => void report(c)} className="ms-auto text-[10px] font-bold text-[#888888]/60 transition hover:text-white">
                      {t("chat.report")}
                    </button>
                  </div>
                </div>
              </div>

              {/* long-press emoji picker */}
              <AnimatePresence>
                {burst && burst.id === c.id && (
                  <div className="pointer-events-none absolute left-8 top-0 z-20" onAnimationEnd={() => setBurst(null)}>
                    {EMOJI_BURST.map((em, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                        animate={{ opacity: 0, x: (i - 2) * 22, y: -52 - (i % 2) * 18, scale: 1.25 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute text-[16px]"
                        style={{ left: burst.x - 32, top: burst.y }}
                      >
                        {em}
                      </motion.span>
                    ))}
                  </div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {pickerFor === c.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute left-8 top-0 z-30 flex gap-1 rounded-full bg-black/85 p-1 ring-1 ring-white/15"
                  >
                    {EMOJI_BURST.map((em) => (
                      <button key={em} onClick={() => void react(c, em)} className="rounded-full px-1.5 py-0.5 text-[14px] transition hover:bg-white/10">
                        {em}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* replies */}
              {c.replies.length > 0 && (
                <div className="ml-10 mt-2 space-y-2 border-l-2 border-[#222228] pl-3">
                  {c.replies.map((r, i) => (
                    <div key={`${c.id}-${i}`} className="flex gap-2">
                      <FanAvatar name={r.name} size={24} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-white">{r.name}</span>
                          <span className="text-[9px] font-bold text-[#888888]">{t("chat.replyingTo", { name: c.name })}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-white/85">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {all.length === 0 && (
          <p className="py-6 text-center text-[11px] font-bold text-[#888888]">{t("watch.joinChat")} 👇</p>
        )}
      </div>

      {/* input */}
      <div className="mt-3">
        <AnimatePresence>
          {replyTo && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-1.5 flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5 text-[10px] font-bold text-[#888888]">
              <span>{t("chat.replyingTo", { name: replyTo.name })}</span>
              <button onClick={() => setReplyTo(null)} aria-label={t("common.cancel")}><X size={12} /></button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative flex items-center gap-2">
          <FanAvatar name={myName} size={32} />
          <input
            value={draft}
            maxLength={MAX_CHAT_CHARS + 20}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void send()}
            placeholder={replyTo ? t("watch.replyTo", { user: replyTo.name }) : t("watch.joinChat")}
            aria-label={t("watch.liveChat")}
            className="min-h-[42px] flex-1 rounded-full border border-[#222228] bg-[#15151A] px-4 py-2.5 text-[12px] text-white outline-none placeholder:text-[#888888]"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => void send()}
            aria-label={t("common.send")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B4FF39] text-black"
          >
            <Send size={16} />
          </motion.button>
          <AnimatePresence>
            {coinFloat > 0 && (
              <motion.span
                key={coinFloat}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                onAnimationComplete={() => setCoinFloat(0)}
                className="pointer-events-none absolute -top-5 right-10 text-[11px] font-black text-[#B4FF39]"
              >
                +10 🪙
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {draft.length > MAX_CHAT_CHARS && (
          <p className="mt-1 text-right text-[9px] font-bold text-[#FF4D4D]">{draft.length}/{MAX_CHAT_CHARS}</p>
        )}
      </div>
    </div>
  );
}

/* ═══ simulated broadcast stage ═══ */
type StageProps = {
  match: LiveMatch;
  minute: number;
  ticker: string;
  latency: number;
  adLeft: number;
  adBreak: boolean;
  isPro: boolean;
  simChip: boolean;
  onDismissSim: () => void;
  paused: boolean;
  onTogglePause: () => void;
  controls: boolean;
  onActivity: () => void;
  onSingleTap: () => void;
  onDoubleTap: (x: number, y: number) => void;
  onSwipeDown: () => void;
  onTouchStartEdge: (x: number) => void;
  onOpenDrawer: () => void;
  onShare: () => void;
  onRotate: () => void;
  onFullscreen: () => void;
  onPip: () => void;
  onSettings: () => void;
  onMatchCenter: () => void;
  landscape: boolean;
  playing: boolean;
};

/* home (lime) dots attack left→right, away (red) right→left */
const HOME_DOTS = [
  { x: [26, 34, 30, 40, 26], y: [90, 62, 118, 90, 90] },
  { x: [70, 96, 84, 120, 70], y: [46, 66, 110, 134, 46] },
  { x: [104, 150, 130, 170, 104], y: [90, 74, 118, 90, 90] },
  { x: [58, 90, 76, 108, 58], y: [136, 146, 128, 146, 136] },
  { x: [58, 96, 76, 108, 58], y: [44, 34, 52, 34, 44] },
];
const AWAY_DOTS = HOME_DOTS.map((d) => ({
  x: d.x.map((v) => 320 - v).reverse(),
  y: [...d.y].reverse(),
}));

function BroadcastStage(p: StageProps) {
  const t = useT();
  const lastTap = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (now - lastTap.current < 300) {
      p.onDoubleTap(x, y);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    setTimeout(() => {
      if (lastTap.current === now) p.onSingleTap();
    }, 310);
  };

  return (
    <div
      className="group relative w-full select-none overflow-hidden bg-black"
      style={{ aspectRatio: "16 / 9", touchAction: p.landscape ? "none" : "pan-y" }}
      onClick={handleTap}
      onPointerMove={p.onActivity}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
        p.onTouchStartEdge(t.clientX);
        p.onActivity();
      }}
      onTouchEnd={(e) => {
        if (!touchStart.current) return;
        const t = e.changedTouches[0];
        const dy = t.clientY - touchStart.current.y;
        if (p.landscape && dy > 70) p.onSwipeDown();
        touchStart.current = null;
      }}
    >
      {p.match.videoUrl ? (
        /* future HLS stream — drops in with zero UI changes */
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className="absolute inset-0 h-full w-full object-cover" src={p.match.videoUrl} controls={false} autoPlay playsInline muted />
      ) : (
        /* simulated broadcast: animated SVG pitch */
        <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-label={t("watch.simulatedFeed")}>
          <rect width="320" height="180" fill="#0E3B24" />
          <g stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none">
            <line x1="160" y1="0" x2="160" y2="180" strokeDasharray="5 5" />
            <circle cx="160" cy="90" r="30" />
            <rect x="0" y="40" width="44" height="100" />
            <rect x="276" y="40" width="44" height="100" />
            <rect x="0" y="64" width="15" height="52" />
            <rect x="305" y="64" width="15" height="52" />
          </g>
          {/* possession sweep */}
          <motion.rect
            x="-120" y="0" width="120" height="180"
            animate={{ x: [-120, 440] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            fill="url(#sweepGrad)"
          />
          <defs>
            <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#B4FF39" stopOpacity="0" />
              <stop offset="50%" stopColor="#B4FF39" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#B4FF39" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* player dots */}
          {!p.paused && (
            <>
              {HOME_DOTS.map((d, i) => (
                <motion.g key={`h${i}`} animate={{ x: d.x, y: d.y }}
                  transition={{ duration: 12 + i, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>
                  <circle cx="0" cy="0" r="4" fill="#B4FF39" stroke="#070709" strokeWidth="1" />
                </motion.g>
              ))}
              {AWAY_DOTS.map((d, i) => (
                <motion.g key={`a${i}`} animate={{ x: d.x, y: d.y }}
                  transition={{ duration: 12 + i, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>
                  <circle cx="0" cy="0" r="4" fill="#FF4D4D" stroke="#070709" strokeWidth="1" />
                </motion.g>
              ))}
              {/* the ball */}
              <motion.g animate={{ x: [160, 96, 226, 60, 268, 160], y: [90, 52, 128, 118, 62, 90] }}
                transition={{ duration: 9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>
                <circle cx="0" cy="0" r="2.6" fill="#FFFFFF" stroke="#070709" strokeWidth="0.8" />
              </motion.g>
            </>
          )}
          {p.paused && (
            <g>
              <circle cx="160" cy="90" r="13" fill="rgba(0,0,0,0.6)" />
              <path d="M156 83v14l12-7z" fill="#B4FF39" />
            </g>
          )}
        </svg>
      )}

      {/* broadcast overlay — score bug top-left */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 rounded-lg bg-black/75 px-2 py-1 ring-1 ring-white/10 backdrop-blur">
          <ClubLogo name={p.match.home} logo={p.match.homeLogo} size={16} />
          <span className="text-[11px] font-black text-white">{p.match.score}</span>
          <ClubLogo name={p.match.away} logo={p.match.awayLogo} size={16} />
          <span className="flex items-center gap-1 rounded bg-[#FF4D4D] px-1.5 py-px text-[9px] font-black text-white">
            <span className="pulse-dot h-1 w-1 rounded-full bg-white" />
            {p.minute}&prime;
          </span>
          {p.isPro && (
            <span className="flex items-center gap-0.5 rounded bg-[#B4FF39] px-1 py-px text-[8px] font-black text-black">
              <Crown size={8} />
              {t("watch.proBadge")}
            </span>
          )}
        </div>
        {/* ad countdown pill — always under the score bug */}
        {!p.isPro && !p.adBreak && (
          <div className="flex w-fit items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-white/80 ring-1 ring-white/10">
            {t("watch.nextAdIn", { time: fmt(p.adLeft) })}
          </div>
        )}
        {p.adBreak && (
          <div className="flex w-fit items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-white/80 ring-1 ring-white/10">
            {t("watch.adBreakBackIn", { time: fmt(p.adLeft) })}
          </div>
        )}
        {/* simulated feed chip */}
        {p.simChip && (
          <div className="pointer-events-auto flex w-fit items-center gap-1.5 rounded-full bg-[#B4FF39] px-2 py-0.5 text-[9px] font-black text-black">
            {t("watch.simulated")}
            <button onClick={(e) => { e.stopPropagation(); p.onDismissSim(); }} aria-label={t("common.close")} className="rounded-full bg-black/20 p-0.5">
              <X size={9} />
            </button>
          </div>
        )}
      </div>

      {/* top-right: league badge + latency */}
      <div className="pointer-events-none absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
        <span className="rounded-md bg-black/75 px-2 py-0.5 text-[9px] font-black text-white ring-1 ring-white/10 backdrop-blur">
          {p.match.flag} {p.match.league}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-[#FF4D4D] px-1.5 py-px text-[8px] font-black text-white">
          {t("common.live")} <span className="font-bold opacity-80">{t("watch.latencyBehind", { sec: p.latency })}</span>
        </span>
      </div>

      {/* bottom: commentary ticker */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden bg-black/65 py-1 backdrop-blur-sm">
        <motion.div
          key={p.ticker}
          initial={{ x: "100%" }}
          animate={{ x: "-100%" }}
          transition={{ duration: 14, ease: "linear" }}
          className="whitespace-nowrap text-[10px] font-bold text-white/90"
        >
          ⚽ {p.ticker}
        </motion.div>
      </div>

      {/* player controls — fade with inactivity (auto-hide 3s) */}
      <motion.div
        animate={{ opacity: p.controls ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: p.controls ? "auto" : "none" }}
        className="absolute inset-x-0 bottom-6 flex items-center justify-between px-3"
      >
        <div className="flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); p.onTogglePause(); }} aria-label={p.playing ? t("watch.pause") : t("watch.play")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
            {p.playing ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button onClick={(e) => { e.stopPropagation(); p.onMatchCenter(); }} aria-label={t("match.matchCenter")}
            className="flex h-9 items-center gap-1 rounded-full bg-black/70 px-2.5 text-[10px] font-bold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
            <BarChart3 size={12} /> Match Center
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); p.onShare(); }} aria-label={t("common.share")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
            <Share2 size={14} />
          </button>
          {p.landscape && (
            <button onClick={(e) => { e.stopPropagation(); p.onOpenDrawer(); }} aria-label={t("watch.openChat")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
              <ChevronRight size={14} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); p.onPip(); }} aria-label={t("a11y.pip")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
            <PictureInPicture2 size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); p.onRotate(); }} aria-label={t("a11y.rotate")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
            <RotateCw size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); p.onFullscreen(); }} aria-label={t("a11y.fullscreen")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
            <Maximize size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); p.onSettings(); }} aria-label={t("watch.settings")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/90">
            <Settings size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ main watch room ═══ */
export default function LiveWatch({ match }: { match: LiveMatch }) {
  const router = useRouter();
  const t = useT();
  const { isPro } = useIsPro();
  const { user } = useAuth();
  const viewers = useViewerCount(String(match.id));
  const stageRef = useRef<HTMLDivElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const visibilityRef = useRef(true);
  const upsellShownRef = useRef(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = useMemo(() => COMMENTARY[match.id] ?? [], [match.id]);

  // monetization timers
  const [adLeft, setAdLeft] = useState(AD_INTERVAL_SECONDS);
  // ?debugad compresses the first ad break for testing (set after mount —
  // reading the URL in the state initializer would hydrate-mismatch the SSR)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("debugad")) {
      setAdLeft(Math.min(3, AD_INTERVAL_SECONDS));
    }
  }, []);
  const [adBreakLeft, setAdBreakLeft] = useState(0);
  const [showUpsell, setShowUpsell] = useState(false);

  // playback / orientation / controls
  const [paused, setPaused] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [controls, setControls] = useState(true);
  const [quality, setQuality] = useState<"auto" | "720p" | "1080p">("auto");
  const [showSettings, setShowSettings] = useState(false);
  const [simChip, setSimChip] = useState(true);
  const [latency, setLatency] = useState(8);
  const [minute, setMinute] = useState(match.minute);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [burstLikes, setBurstLikes] = useState(0);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  // restore persisted prefs
  useEffect(() => {
    setQuality(readJSON<"auto" | "720p" | "1080p">("jum-watch-quality", "auto"));
    setLatency(6 + Math.floor(Math.random() * 7));
    setBurstLikes(readJSON<number>(`jum-watch-burst-${match.id}`, 0));
  }, [match.id]);

  useEffect(() => {
    writeJSON("jum-watch-quality", quality);
  }, [quality]);

  // tab visibility — pauses every timer
  useEffect(() => {
    const onVis = () => {
      visibilityRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // viewer presence — write online doc + counter on open, server-side
  // onDisconnect cleans up both (survives crashes/tabs closed). Fail-closed:
  // demo mode / no uid / Firestore unreachable → silently absent.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let leave: (() => Promise<void>) | undefined;
    let cancelled = false;
    void joinPresence(String(match.id), uid).then((l) => {
      if (cancelled) void l();
      else leave = l;
    });
    return () => {
      cancelled = true;
      void leave?.();
    };
  }, [user?.uid, match.id]);

  // physical rotation syncs landscape mode; rotating back exits fullscreen
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const sync = () => {
      setLandscape(mq.matches);
      if (!mq.matches && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // controls auto-hide after 3s of inactivity
  const pokeControls = useCallback(() => {
    setControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setControls(false), CONTROLS_HIDE_MS);
  }, []);
  useEffect(() => {
    pokeControls();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [pokeControls]);

  // free tier: viewing countdown → interstitial every AD_INTERVAL_SECONDS
  useEffect(() => {
    if (isPro) return;
    if (!readJSON("jum-watch-session", null)) writeJSON("jum-watch-session", { start: Date.now() });
  }, [isPro]);

  useEffect(() => {
    if (isPro || adBreakLeft > 0 || paused || showUpsell) return;
    const iv = setInterval(() => {
      if (!visibilityRef.current) return;
      setAdLeft((s) => {
        if (s <= 1) {
          setAdBreakLeft(INTERSTITIAL_SECONDS);
          return INTERSTITIAL_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [isPro, adBreakLeft, paused, showUpsell]);

  // interstitial countdown → close + resume + reset interval
  useEffect(() => {
    if (adBreakLeft <= 0) return;
    const iv = setInterval(() => {
      setAdBreakLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [adBreakLeft > 0]);

  // free-view upsell after 60s
  useEffect(() => {
    if (isPro) return;
    const iv = setInterval(() => {
      if (!visibilityRef.current || upsellShownRef.current) return;
      upsellShownRef.current = true;
      setShowUpsell(true);
    }, UPSELL_AFTER_SECONDS * 1000);
    return () => clearInterval(iv);
  }, [isPro]);

  // mock live clock + rotating commentary ticker — frozen while an
  // interstitial is open (the simulated broadcast pauses for the ad)
  useEffect(() => {
    const iv = setInterval(() => {
      if (!visibilityRef.current || adBreakLeft > 0) return;
      setMinute((m) => (m < 90 ? m + 1 : m));
    }, 20000);
    const tIv = setInterval(() => {
      if (!visibilityRef.current || adBreakLeft > 0) return;
      setTickerIdx((i) => i + 1);
    }, 12000);
    return () => {
      clearInterval(iv);
      clearInterval(tIv);
    };
  }, [adBreakLeft]);

  const ticker = lines.length ? lines[tickerIdx % lines.length] : `${match.home} ${match.score} ${match.away}`;

  const share = useCallback(async () => {
    const text = `🔴 LIVE: ${match.home} ${match.score} ${match.away} (${minute}') — watch + chat on JUM Football`;
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "JUM Football", text, url });
        return;
      } catch {
        return; // user dismissed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      say("Link copied to clipboard");
    } catch {
      say("Sharing not available");
    }
  }, [match, minute, say]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (stageRef.current) {
      stageRef.current.requestFullscreen?.().catch(() => say("Fullscreen not available"));
    }
    pokeControls();
  }, [pokeControls, say]);

  const toggleRotate = useCallback(() => {
    setLandscape((l) => !l);
    pokeControls();
  }, [pokeControls]);

  const togglePip = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        say("Exited picture-in-picture");
      } else if (pipVideoRef.current && document.pictureInPictureEnabled) {
        await pipVideoRef.current.requestPictureInPicture();
        say("Picture-in-picture on");
      } else {
        say("PiP isn't available on the simulated feed");
      }
    } catch {
      say("PiP isn't available on the simulated feed");
    }
    pokeControls();
  }, [pokeControls, say]);

  const handleDoubleTap = useCallback((x: number, y: number) => {
    const id = Date.now();
    setBursts((b) => [...b.slice(-6), { id, x, y }]);
    setBurstLikes((n) => {
      const next = n + 1;
      writeJSON(`jum-watch-burst-${match.id}`, next);
      return next;
    });
  }, [match.id]);

  const exitLandscape = useCallback(() => {
    setLandscape(false);
    setDrawerOpen(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const pickQuality = (q: "auto" | "720p" | "1080p") => {
    if (!isPro && q !== "auto") {
      setShowSettings(false);
      setShowUpsell(true);
      say("Quality above Auto is a PRO feature");
      return;
    }
    setQuality(q);
    say(`Quality: ${q === "auto" ? "Auto (720p)" : q}`);
  };

  const momentum = useMemo(
    () => (match.momentum ?? []).map((v, i) => ({ i, v })),
    [match.momentum]
  );
  const homePct = useMemo(() => {
    if (!momentum.length) return 50;
    const avg = momentum.reduce((s, p) => s + p.v, 0) / momentum.length;
    return Math.max(5, Math.min(90, Math.round(avg)));
  }, [momentum]);
  const awayPct = 100 - homePct;

  const QUALITIES: { q: "auto" | "720p" | "1080p"; label: string }[] = [
    { q: "auto", label: "" },
    { q: "720p", label: "720p" },
    { q: "1080p", label: "1080p" },
  ];

  const stage = (
    <BroadcastStage
      match={match}
      minute={minute}
      ticker={ticker}
      latency={latency}
      adLeft={adBreakLeft > 0 ? adBreakLeft : adLeft}
      adBreak={adBreakLeft > 0}
      isPro={isPro}
      simChip={simChip}
      onDismissSim={() => setSimChip(false)}
      paused={paused}
      onTogglePause={() => setPaused((v) => !v)}
      controls={controls}
      onActivity={pokeControls}
      onSingleTap={() => setControls((c) => !c)}
      onDoubleTap={handleDoubleTap}
      onSwipeDown={exitLandscape}
      onTouchStartEdge={(x) => {
        if (landscape && window.innerWidth - x < 28) setDrawerOpen(true);
      }}
      onOpenDrawer={() => setDrawerOpen(true)}
      onShare={() => void share()}
      onRotate={toggleRotate}
      onFullscreen={toggleFullscreen}
      onPip={() => void togglePip()}
      onSettings={() => setShowSettings(true)}
      onMatchCenter={() => router.push(`/match/${match.id}/`)}
      landscape={landscape}
      playing={!paused}
    />
  );

  return (
    <div className="min-h-screen bg-[#070709] pb-24 text-white">
      {/* app header */}
      {!landscape && (
        <header className="sticky top-0 z-40 border-b border-[#222228] bg-[#070709]/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-3">
            <button
              onClick={() => {
                const saved = window.sessionStorage.getItem("jum-live-scroll");
                if (saved !== null) router.back();
                else router.push("/live/");
              }}
              aria-label={t("common.back")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#AAAAAA] transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft size={19} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold">{match.home} vs {match.away}</p>
              <p className="text-[10px] font-bold text-[#888888]">
                {match.flag} {match.league} · 👁 {viewers} {t("watch.viewersLabel")}
              </p>
            </div>
            {isPro ? (
              <span className="flex items-center gap-1 rounded-full bg-[#B4FF39] px-2.5 py-1 text-[10px] font-black text-black">
                <Crown size={11} />
                PRO
              </span>
            ) : (
              <button
                onClick={() => setShowUpsell(true)}
                aria-label={t("watch.goPro")}
                className="flex items-center gap-1 rounded-full bg-[#B4FF39]/15 px-2.5 py-1 text-[10px] font-black text-[#B4FF39] ring-1 ring-[#B4FF39]/40"
              >
                <Zap size={11} />
                Go PRO
              </button>
            )}
          </div>
        </header>
      )}

      {/* video — portrait: in-flow; landscape: full-bleed */}
      {landscape ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
          <div ref={stageRef} className="w-full max-w-[100vw]" style={{ aspectRatio: "16 / 9" }}>
            {stage}
            {/* double-tap heart bursts */}
            {bursts.map((b) => (
              <motion.span
                key={b.id}
                initial={{ opacity: 1, scale: 0.4 }}
                animate={{ opacity: 0, scale: 1.6, y: -70 }}
                transition={{ duration: 1, ease: "easeOut" }}
                onAnimationComplete={() => setBursts((bs) => bs.filter((x) => x.id !== b.id))}
                className="pointer-events-none absolute z-20"
                style={{ left: `calc(50% + ${b.x - 195}px)`, top: `calc(50% + ${b.y - 110}px)` }}
              >
                <Heart size={34} fill="#FF4D4D" color="#FF4D4D" />
              </motion.span>
            ))}

            {/* chat drawer (slide-over) */}
            <AnimatePresence>
              {drawerOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setDrawerOpen(false)}
                    className="absolute inset-0 z-30 bg-black/50"
                  />
                  <motion.aside
                    initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="absolute inset-y-0 right-0 z-40 flex w-[320px] max-w-[85vw] flex-col border-l border-[#222228] bg-[#070709] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[13px] font-extrabold">{t("watch.liveChat")}</p>
                      <button onClick={() => setDrawerOpen(false)} aria-label={t("watch.closeDrawer")}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[#AAAAAA] hover:bg-white/5 hover:text-white">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      <WatchChat matchId={match.id} standalone />
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[480px]">
          <div ref={stageRef} className="relative">
            {stage}
            {bursts.map((b) => (
              <motion.span
                key={b.id}
                initial={{ opacity: 1, scale: 0.4 }}
                animate={{ opacity: 0, scale: 1.6, y: -70 }}
                transition={{ duration: 1, ease: "easeOut" }}
                onAnimationComplete={() => setBursts((bs) => bs.filter((x) => x.id !== b.id))}
                className="pointer-events-none absolute z-20"
                style={{ left: b.x - 17, top: b.y - 17 }}
              >
                <Heart size={34} fill="#FF4D4D" color="#FF4D4D" />
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* portrait body: quality row, momentum, chat */}
      {!landscape && (
        <main className="mx-auto max-w-[480px] space-y-3 px-3 pt-3">
          {/* quality row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#888888]">{t("watch.quality")}</span>
            <div className="flex gap-1.5">
              {QUALITIES.map(({ q, label }) => (
                <button
                  key={q}
                  onClick={() => pickQuality(q)}
                  className={`flex min-h-[32px] items-center gap-1 rounded-full px-3 text-[11px] font-bold transition ${
                    quality === q
                      ? "bg-[#B4FF39] font-black text-black"
                      : "border border-[#222228] bg-[#15151A] text-[#AAAAAA] hover:text-white"
                  }`}
                >
                  {q === "auto" ? t("watch.auto") : label}
                  {!isPro && q !== "auto" && <Lock size={9} />}
                </button>
              ))}
            </div>
            <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-[#888888]">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#FF4D4D]" />
              LIVE · {latency}s behind
            </span>
          </div>

          {/* momentum wave + win probability */}
          <section className="rounded-2xl border border-[#222228] bg-[#15151A] p-3.5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-extrabold">{t("watch.momentum")}</h3>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#888888]">
                <Heart size={10} className="text-[#FF4D4D]" fill="#FF4D4D" />
                {burstLikes}
              </span>
            </div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={momentum} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id="wmom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B4FF39" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#B4FF39" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#B4FF39" strokeWidth={2} fill="url(#wmom)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-14 truncate text-[10px] font-bold text-[#B4FF39]">{match.home}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/60">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: "#B4FF39" }}
                    animate={{ width: `${homePct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[#AAAAAA]">{homePct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-14 truncate text-[10px] font-bold text-[#FF4D4D]">{match.away}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/60">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: "#FF4D4D" }}
                    animate={{ width: `${awayPct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <span className="w-8 text-right text-[10px] font-bold tabular-nums text-[#AAAAAA]">{awayPct}%</span>
              </div>
            </div>
          </section>

          {/* live chat */}
          <section className="rounded-2xl border border-[#222228] bg-[#15151A] p-3.5">
            <WatchChat matchId={match.id} />
          </section>
        </main>
      )}

      {/* hidden video element — PiP target once real streams land; graceful fallback today */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={pipVideoRef} className="hidden" muted playsInline />

      {/* everything dims during ad breaks; the score bug stays visible (never hidden) */}
      <motion.div animate={{ opacity: adBreakLeft > 0 ? 0.25 : 1 }} transition={{ duration: 0.3 }} className="contents" />

      {/* interstitial ad overlay */}
      <AnimatePresence>
        {adBreakLeft > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <div className="w-full max-w-[340px] rounded-2xl border border-[#222228] bg-[#15151A] p-5 text-center">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#888888]">{t("watch.adBreak")}</p>
                <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black tabular-nums text-[#B4FF39]">
                  {adBreakLeft}s
                </span>
              </div>
              <div className="mt-3 flex justify-center">
                <AdBanner variant="mid" />
              </div>
              <p className="mt-4 text-[12px] text-[#AAAAAA]">
                {t("watch.proRemovesAds")}
              </p>
              <div className="mt-4 flex gap-2">
                {adBreakLeft <= INTERSTITIAL_SECONDS - SKIP_AFTER_SECONDS ? (
                  <button
                    onClick={() => setAdBreakLeft(0)}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-[#222228] bg-black/40 text-[12px] font-bold text-white transition hover:bg-black/60"
                  >
                    <X size={13} />
                    {t("watch.skipAd")}
                  </button>
                ) : (
                  <div className="flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-[#222228] bg-black/40 text-[12px] font-bold text-[#888888]">
                    {t("watch.skipIn", { sec: SKIP_AFTER_SECONDS - (INTERSTITIAL_SECONDS - adBreakLeft) })}
                  </div>
                )}
                <button
                  onClick={() => { setAdBreakLeft(0); setShowUpsell(true); }}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#B4FF39] text-[12px] font-black text-black"
                >
                  <Zap size={13} />
                  Go PRO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* settings sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)} className="fixed inset-0 z-[75] bg-black/60" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[76] mx-auto max-w-[480px] rounded-t-3xl border border-[#222228] bg-[#15151A] p-5 pb-8"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold">
                  <Settings size={16} className="text-[#B4FF39]" />
                  Playback settings
                </h3>
                <button onClick={() => setShowSettings(false)} aria-label={t("common.close")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#AAAAAA] hover:bg-white/5 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#888888]">{t("watch.quality")}</p>
              <div className="flex gap-2">
                {QUALITIES.map(({ q, label }) => (
                  <button
                    key={q}
                    onClick={() => pickQuality(q)}
                    className={`flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl text-[12px] font-bold transition ${
                      quality === q ? "bg-[#B4FF39] font-black text-black" : "border border-[#222228] bg-black/40 text-[#AAAAAA]"
                    }`}
                  >
                    {label}
                    {!isPro && q !== "auto" && <Lock size={10} />}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 text-[11px] text-[#AAAAAA]">
                <p>· {t("watch.latency")}: <span className="font-bold text-white">{t("watch.latencyBehind", { sec: latency })}</span></p>
                <p>· {t("watch.feed")}: <span className="font-bold text-white">{t("watch.simulatedFeed")}</span> — {t("watch.hlsNote")}</p>
                {!isPro && <p>· {t("watch.proUnlocks")}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* upsell sheet */}
      <AnimatePresence>
        {showUpsell && !isPro && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUpsell(false)} className="fixed inset-0 z-[80] bg-black/60" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-[480px] rounded-t-3xl border border-[#222228] bg-[#15151A] p-5 pb-8"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold">
                  <Zap size={16} className="text-[#B4FF39]" />
                  JUM PRO
                </h3>
                <button onClick={() => setShowUpsell(false)} aria-label={t("common.close")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#AAAAAA] hover:bg-white/5 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[13px] text-white/85">
                Watch every league with <span className="font-black text-[#B4FF39]">zero ads</span> — <span className="font-black text-[#B4FF39]">$5/month</span>
              </p>
              <ul className="mt-2 space-y-1 text-[12px] text-[#AAAAAA]">
                <li>· no ad breaks, ever</li>
                <li>· 720p / 1080p quality unlocked</li>
                <li>· goal alerts + all leagues</li>
              </ul>
              <div className="mt-4 space-y-2">
                  <button onClick={() => { setShowUpsell(false); router.push("/pro/checkout/"); }}
                    className="min-h-[46px] w-full rounded-full bg-[#B4FF39] text-[13px] font-black text-black">
                    Go PRO — $5/mo
                  </button>
                  <button onClick={() => setShowUpsell(false)}
                    className="min-h-[46px] w-full rounded-full border border-[#222228] bg-black/40 text-[13px] font-bold text-[#AAAAAA]">
                    Keep watching free
                  </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#B4FF39] px-4 py-2 text-[12px] font-black text-black shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {!landscape && <BottomNav />}
    </div>
  );
}
