"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// ── Toasts ───────────────────────────────────────────────────

type Toast = { id: number; msg: string };
const ToastCtx = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-1.5 px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in max-w-sm rounded-full bg-card px-4 py-2 text-center text-[12px] font-semibold text-white shadow-xl shadow-black/50 ring-1 ring-accent/30"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ── localStorage-backed flags ────────────────────────────────

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("jum-store-change"));
}

export function useAlerts(matchId: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(read<string[]>("jum-alerts", []).includes(matchId));
    sync();
    window.addEventListener("jum-store-change", sync);
    return () => window.removeEventListener("jum-store-change", sync);
  }, [matchId]);
  const toggle = useCallback(() => {
    const cur = read<string[]>("jum-alerts", []);
    write("jum-alerts", cur.includes(matchId) ? cur.filter((x) => x !== matchId) : [...cur, matchId]);
  }, [matchId]);
  return { on, toggle };
}

/** Session-only crowd reactions (world meter). */
export function useReactions(matchId: string, seed: { wow: number; fire: number; goal: number }) {
  const [extra, setExtra] = useState({ wow: 0, fire: 0, goal: 0 });
  const key = `jum-react-${matchId}`;
  useEffect(() => {
    setExtra(read(key, { wow: 0, fire: 0, goal: 0 }));
  }, [key]);
  const pulse = useCallback(
    (kind: keyof typeof seed) => {
      setExtra((e) => {
        const next = { ...e, [kind]: e[kind] + 1 };
        write(key, next);
        return next;
      });
    },
    [key]
  );
  return {
    counts: { wow: seed.wow + extra.wow, fire: seed.fire + extra.fire, goal: seed.goal + extra.goal },
    pulse,
  };
}

// ── Confetti ─────────────────────────────────────────────────

export function fireConfetti() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("jum-confetti"));
}

// ── Goal notifications (local toast/notification) ────────────

export function notifyGoal(title: string, body: string) {
  if (typeof window === "undefined") return;
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
      return;
    } catch {
      /* fall through to toast */
    }
  }
}

// ── Match likes (heart pop) ──────────────────────────────────

export function useMatchLike(matchId: string) {
  const key = `jum-like-${matchId}`;
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    setLiked(read(key, false));
  }, [key]);
  const toggle = useCallback(() => {
    const next = !read(key, false);
    write(key, next);
    setLiked(next);
    return next;
  }, [key]);
  return { liked, toggle };
}

// ── Polls (one vote per user) ────────────────────────────────

export type PollVote = "home" | "draw" | "away";

export function usePoll(matchId: string) {
  const key = `jum-poll-${matchId}`;
  const [vote, setVote] = useState<PollVote | null>(null);
  useEffect(() => {
    setVote(read(key, null));
  }, [key]);
  const cast = useCallback(
    (v: PollVote) => {
      if (read(key, null)) return false;
      write(key, v);
      setVote(v);
      return true;
    },
    [key]
  );
  return { vote, cast };
}

// ── Raffle entries ───────────────────────────────────────────

export function useRaffleEntry(raffleId: string) {
  const key = `jum-raffle-${raffleId}`;
  const [joined, setJoined] = useState(false);
  useEffect(() => {
    setJoined(read(key, false));
  }, [key]);
  const join = useCallback(() => {
    if (read(key, false)) return false;
    write(key, true);
    setJoined(true);
    return true;
  }, [key]);
  return { joined, join };
}

// ── Live chat (persisted) ────────────────────────────────────

export interface ChatMsg {
  id: string;
  fan: string;
  color: string;
  minute: number;
  text: string;
  likes: number;
  likedByMe?: boolean;
  mine?: boolean;
  superFan?: boolean;
}

export function useChat(matchId: string, seed: import("@/lib/jumMock").ChatMessage[]) {
  const key = `jum-chat-${matchId}`;
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  useEffect(() => {
    const mine = read<ChatMsg[]>(key, []);
    setMsgs([...mine, ...seed.map((s) => ({ ...s, likedByMe: false }))].sort((a, b) => b.minute - a.minute));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const send = useCallback(
    (text: string, minute: number) => {
      const msg: ChatMsg = {
        id: `u${Date.now()}`,
        fan: "You",
        color: "#C8FF3D",
        minute,
        text,
        likes: 0,
        mine: true,
      };
      setMsgs((m) => {
        const next = [msg, ...m];
        write(key, next.filter((x) => x.mine));
        return next;
      });
      return msg;
    },
    [key]
  );
  const like = useCallback((id: string) => {
    setMsgs((m) => {
      const next = m.map((x) =>
        x.id === id ? { ...x, likes: x.likedByMe ? x.likes - 1 : x.likes + 1, likedByMe: !x.likedByMe } : x
      );
      write(key, next.filter((x) => x.mine));
      return next;
    });
  }, [key]);
  return { msgs, send, like };
}

// ── Daily visit streak ───────────────────────────────────────

export function useStreak() {
  const [count, setCount] = useState(1);
  const [bumped, setBumped] = useState(false);
  useEffect(() => {
    const today = new Date().toDateString();
    const cur = read<{ last: string; count: number }>("jum-streak", { last: "", count: 0 });
    if (cur.last === today) {
      setCount(cur.count);
      return;
    }
    const yesterday = new Date(Date.now() - 864e5).toDateString();
    const next = cur.last === yesterday ? cur.count + 1 : 1;
    write("jum-streak", { last: today, count: next });
    setCount(next);
    setBumped(true);
  }, []);
  return { count, bumped };
}

// ── Fans leaderboard points ──────────────────────────────────

export function awardFanPoints(points: number) {
  const cur = read<number>("jum-fan-points", 0);
  write("jum-fan-points", cur + points);
}

export function useFanPoints() {
  const [points, setPoints] = useState(0);
  useEffect(() => {
    const sync = () => setPoints(read("jum-fan-points", 0));
    sync();
    window.addEventListener("jum-store-change", sync);
    return () => window.removeEventListener("jum-store-change", sync);
  }, []);
  return points;
}

// ── News reactions (one per user per post) ───────────────────

export type NewsReact = "love" | "angry" | "wow" | "laugh";

export function useNewsReaction(postId: string, seed: Record<NewsReact, number>) {
  const key = `jum-news-react-${postId}`;
  const [mine, setMine] = useState<NewsReact | null>(null);
  useEffect(() => {
    setMine(read(key, null));
  }, [key]);
  const react = useCallback(
    (r: NewsReact) => {
      const cur = read<NewsReact | null>(key, null);
      if (cur === r) {
        write(key, null);
        setMine(null);
        return;
      }
      write(key, r);
      setMine(r);
      awardFanPoints(2);
    },
    [key]
  );
  const counts: Record<NewsReact, number> = {
    love: seed.love + (mine === "love" ? 1 : 0),
    angry: seed.angry + (mine === "angry" ? 1 : 0),
    wow: seed.wow + (mine === "wow" ? 1 : 0),
    laugh: seed.laugh + (mine === "laugh" ? 1 : 0),
  };
  return { counts, mine, react };
}

// ── Lifestyle post saves / likes ─────────────────────────────

export function usePostFlags(postId: string) {
  const likeKey = `jum-post-like-${postId}`;
  const saveKey = `jum-post-save-${postId}`;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setLiked(read(likeKey, false));
    setSaved(read(saveKey, false));
  }, [likeKey, saveKey]);
  const toggleLike = useCallback(() => {
    const next = !read(likeKey, false);
    write(likeKey, next);
    setLiked(next);
    if (next) awardFanPoints(1);
    return next;
  }, [likeKey]);
  const toggleSave = useCallback(() => {
    const next = !read(saveKey, false);
    write(saveKey, next);
    setSaved(next);
    return next;
  }, [saveKey]);
  return { liked, saved, toggleLike, toggleSave };
}
