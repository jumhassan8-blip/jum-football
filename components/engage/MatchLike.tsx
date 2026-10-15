"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import type { Match } from "@/lib/jumMock";
import { useMatchLike, useToast } from "@/lib/store";
import { useT } from "@/lib/i18n";

/** Like the match — framer-motion heart pop, persisted, count displayed. */
export default function MatchLike({ match }: { match: Match }) {
  const t = useT();
  const base = 400 + (match.tipsters % 7) * 113;
  const { liked, toggle } = useMatchLike(match.id);
  const toast = useToast();
  const [pop, setPop] = useState(0);

  return (
    <button
      onClick={() => {
        const nowLiked = toggle();
        setPop(Date.now());
        toast(nowLiked ? "Loved this match ❤" : "Like removed");
      }}
      aria-label={t("a11y.likeMatch")}
      className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 ring-1 ring-white/10 transition hover:ring-live/50"
    >
      <motion.span
        key={pop}
        initial={{ scale: liked ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 12 }}
        className={liked ? "text-live" : "text-dim"}
      >
        <Heart size={18} fill={liked ? "currentColor" : "none"} />
      </motion.span>
      <span className="text-[12px] font-bold">{(base + (liked ? 1 : 0)).toLocaleString()}</span>
    </button>
  );
}
