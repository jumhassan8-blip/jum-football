"use client";

import type { NewsItem } from "@/lib/jumMock";
import { useNewsReaction, type NewsReact } from "@/lib/store";

const EMOJIS: { key: NewsReact; emoji: string; label: string }[] = [
  { key: "love", emoji: "😍", label: "Love" },
  { key: "angry", emoji: "😡", label: "Angry" },
  { key: "wow", emoji: "😱", label: "Wow" },
  { key: "laugh", emoji: "😂", label: "Laugh" },
];

/** News reactions — one per user per post, counts persist. */
export default function NewsReactions({ item }: { item: NewsItem }) {
  const seed = {
    love: Math.round(item.fire * 6.4),
    angry: Math.round(item.comments * 0.05),
    wow: Math.round(item.fire * 2.1),
    laugh: Math.round(item.comments * 0.08),
  };
  const { counts, mine, react } = useNewsReaction(item.id, seed);

  return (
    <div className="flex gap-1.5">
      {EMOJIS.map((e) => (
        <button
          key={e.key}
          onClick={() => react(e.key)}
          aria-label={`React ${e.label}`}
          className={`flex min-h-[32px] items-center gap-1 rounded-full px-2 text-[11px] font-bold ring-1 transition active:scale-95 ${
            mine === e.key ? "bg-accent/15 text-accent ring-accent/40" : "bg-white/[0.04] text-dim ring-white/10 hover:text-white"
          }`}
        >
          <span>{e.emoji}</span>
          <span className="tabular-nums">{counts[e.key].toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}
