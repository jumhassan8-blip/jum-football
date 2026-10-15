"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { LIFESTYLE_POSTS, type LifestylePost } from "@/lib/lifestyleData";
import JumAd from "@/components/JumAd";
import FanAvatar from "@/components/FanAvatar";
import { useT } from "@/lib/i18n";

const CATEGORIES = ["All", "Cars", "Mansions", "Watches", "Fashion", "Family", "Jets"] as const;

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

function PostCard({ post }: { post: LifestylePost }) {
  const t = useT();
  const likeKey = `jumLifeLike-${post.id}`;
  const saveKey = `jumLifeSave-${post.id}`;
  const followKey = `jumLifeFollow-${post.player}`;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [burst, setBurst] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState(0);

  useEffect(() => {
    setLiked(readJSON(likeKey, false));
    setSaved(readJSON(saveKey, false));
    setFollowing(readJSON(followKey, false));
  }, [likeKey, saveKey, followKey]);

  const toggleLike = (forceOn = false) => {
    const next = forceOn ? true : !liked;
    if (next === liked) return;
    setLiked(next);
    writeJSON(likeKey, next);
  };

  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTap < 280) {
      // double tap → heart burst + like
      if (!liked) toggleLike(true);
      setBurst(now);
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  const share = async () => {
    const text = `${post.title} — via JUM Lifestyle`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative m-3 h-[85vh] snap-start overflow-hidden rounded-2xl bg-[#15151A]">
      {/* image + double-tap */}
      <button onClick={onImageTap} aria-label={post.title} className="absolute inset-0 h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt={post.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </button>
      {/* gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* double-tap heart burst */}
      {burst && (
        <motion.span
          key={burst}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={() => setBurst(null)}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[80px]"
        >
          ❤️
        </motion.span>
      )}

      {/* top row */}
      <div className="absolute left-3 right-3 top-3 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="rounded-full border-2 border-[#B4FF39]"><FanAvatar name={post.player} size={36} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold">{post.player}</p>
          <span className="mt-0.5 inline-block rounded-full bg-[#B4FF39] px-2 py-px text-[10px] font-black text-black">
            {post.team} • {post.category}
          </span>
        </div>
        <button
          onClick={() => {
            const next = !following;
            setFollowing(next);
            writeJSON(followKey, next);
          }}
          className={`rounded-full px-3 py-1 text-xs font-black transition ${
            following ? "bg-[#15151A] text-[#B4FF39] ring-1 ring-[#B4FF39]" : "bg-white text-black"
          }`}
        >
          {following ? "Following" : "Follow"}
        </button>
      </div>

      {/* video badge */}
      {post.isVideo && (
        <span className="absolute right-3 top-16 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black text-white">
          ▶ VIDEO
        </span>
      )}

      {/* bottom content */}
      <div className="absolute bottom-4 left-3 right-16">
        <h3 className="text-[20px] font-bold leading-tight">{post.title}</h3>
        <p className="mt-1.5 text-[12px] font-bold">
          <span className="text-[#B4FF39]">{post.price}</span>
          <span className="text-[#AAAAAA]"> • {post.brand}</span>
        </p>
      </div>

      {/* right rail */}
      <div className="absolute bottom-20 right-2 flex flex-col items-center gap-4">
        <button onClick={() => toggleLike()} aria-label={t("common.like")} className="flex flex-col items-center gap-0.5">
          <motion.span whileTap={{ scale: 1.4 }}>
            <Heart size={32} fill={liked ? "#FF4D4D" : "none"} className={liked ? "text-[#FF4D4D]" : "text-white"} />
          </motion.span>
          <span className="text-[10px] font-bold">{(post.likes + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button aria-label={t("a11y.comments")} className="flex flex-col items-center gap-0.5 text-white">
          <MessageCircle size={32} />
          <span className="text-[10px] font-bold">{(post.id * 731) % 9000}</span>
        </button>
        <button onClick={share} aria-label={t("common.share")} className="text-white">
          <motion.span whileTap={{ scale: 1.3 }}>
            <Share2 size={32} />
          </motion.span>
        </button>
        <button
          onClick={() => {
            const next = !saved;
            setSaved(next);
            writeJSON(saveKey, next);
          }}
          aria-label={t("common.save")}
          className="text-white"
        >
          <Bookmark size={32} fill={saved ? "#B4FF39" : "none"} className={saved ? "text-[#B4FF39]" : "text-white"} />
        </button>
        <span className="text-[10px] font-bold text-[#AAAAAA]">{post.views}</span>
      </div>
    </div>
  );
}

export default function LifestyleFeed() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const feed = useMemo(() => {
    const posts = category === "All" ? LIFESTYLE_POSTS : LIFESTYLE_POSTS.filter((p) => p.category === category);
    // interleave native ad every 4 posts
    const out: ({ kind: "post"; post: LifestylePost } | { kind: "ad"; key: string })[] = [];
    posts.forEach((p, i) => {
      out.push({ kind: "post", post: p });
      if ((i + 1) % 4 === 0) out.push({ kind: "ad", key: `ad-${i}` });
    });
    return out;
  }, [category]);

  return (
    <div className="relative">
      {/* sticky category pills */}
      <div className="no-scrollbar sticky top-0 z-30 flex gap-1.5 overflow-x-auto bg-[#070709]/95 px-3 py-2 backdrop-blur">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              category === c ? "bg-[#B4FF39] font-bold text-black" : "bg-[#15151A] text-[#888888]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* snap feed */}
      <div className="h-screen snap-y snap-mandatory overflow-y-scroll">
        {feed.map((item) =>
          item.kind === "post" ? (
            <PostCard key={item.post.id} post={item.post} />
          ) : (
            <div key={item.key} className="m-3">
              <JumAd type="native" />
            </div>
          )
        )}
        {feed.length === 0 && (
          <p className="py-20 text-center text-[12px] text-[#888888]">No posts in {category} yet.</p>
        )}
      </div>
    </div>
  );
}
