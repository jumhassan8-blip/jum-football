"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Heart, Share2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import type { LifestylePost, Player } from "@/lib/jumMock";
import { leagueById, lifestyleFor, teamById } from "@/lib/api";
import { usePostFlags, useToast } from "@/lib/store";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";
import AdBanner from "@/components/AdBanner";
import { useT } from "@/lib/i18n";

const TABS = ["Stats", "Lifestyle", "News"] as const;
type Tab = (typeof TABS)[number];

function LifestyleCard({ post }: { post: LifestylePost }) {
  const t = useT();
  const { liked, saved, toggleLike, toggleSave } = usePostFlags(post.id);
  const toast = useToast();
  const [pop, setPop] = useState(0);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: `${post.title} · via JUM Football` });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(`${post.title} · via JUM Football`);
      toast("Link copied to clipboard");
    } catch {
      toast("Sharing not available here");
    }
  };

  return (
    <article className="overflow-hidden rounded-card bg-card ring-1 ring-white/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={post.image} alt={post.title} loading="lazy" className="h-36 w-full object-cover" />
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="rounded bg-accent2/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-accent2">
            {post.tag}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-dim">
            <Eye size={11} /> {post.views}
          </span>
        </div>
        <h4 className="mt-1.5 line-clamp-2 text-[12px] font-bold leading-snug">{post.title}</h4>
        <div className="mt-2 flex items-center gap-1">
          <motion.button
            key={pop}
            initial={{ scale: liked ? 0.5 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 12 }}
            onClick={() => {
              const now = toggleLike();
              setPop(Date.now());
              toast(now ? "Added to liked posts ❤" : "Removed from liked posts");
            }}
            aria-label={t("common.like")}
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${liked ? "bg-live/15 text-live" : "bg-white/[0.05] text-dim"}`}
          >
            <Heart size={12} fill={liked ? "currentColor" : "none"} />
            {(post.likes + (liked ? 1 : 0)).toLocaleString()}
          </motion.button>
          <button
            onClick={share}
            aria-label={t("common.share")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-dim hover:text-white"
          >
            <Share2 size={12} />
          </button>
          <button
            onClick={() => toast(toggleSave() ? "Saved to your collection 🔖" : "Removed from collection")}
            aria-label={t("common.save")}
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full ${saved ? "bg-accent/15 text-accent" : "bg-white/[0.05] text-dim hover:text-white"}`}
          >
            <Bookmark size={12} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PlayerView({ player }: { player: Player }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("Stats");
  const team = teamById(player.teamId);
  const league = team ? leagueById(team.country) : undefined;
  const lifestyle = lifestyleFor(player.id);

  const stats = [
    { k: "Goals", v: String(player.goals) },
    { k: "Assists", v: String(player.assists) },
    { k: "Rating", v: player.rating.toFixed(1) },
    { k: "Appearances", v: String(player.goals + player.assists + 9) },
    { k: "Minutes", v: `${(player.goals + player.assists + 9) * 78}'` },
    { k: "Goal involvements /90", v: ((player.goals + player.assists) / ((player.goals + player.assists + 9) * 0.87)).toFixed(2) },
  ];

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      {/* profile header */}
      <div className="border-b border-divider bg-card">
        <div className="mx-auto max-w-lg px-4 pb-3 pt-1 lg:max-w-3xl">
          <Link
            href="/search/"
            aria-label={t("common.back")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-[22px] font-black text-accent ring-2 ring-accent/40">
              {player.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-extrabold">{player.name}</h1>
              {team && (
                <Link href="/follow/" className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-dim hover:text-white">
                  <TeamBadge team={team} size={16} />
                  {team.name}
                  {league ? ` · ${league.name}` : ""}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-lg gap-1 px-4 lg:max-w-3xl">
          {TABS.map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`relative min-h-[42px] flex-1 text-[13px] font-bold transition-colors ${
                tab === tb ? "text-accent" : "text-dim hover:text-white"
              }`}
            >
              {tb === "Stats" ? t("player.stats") : tb === "Lifestyle" ? t("player.lifestyle") : t("player.news")}
              {tab === tb && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4 lg:max-w-3xl">
        {tab === "Stats" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {stats.map((s) => (
                <div key={s.k} className="rounded-card bg-card p-3 text-center">
                  <p className="text-[17px] font-black text-accent">{s.v}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-dim">{s.k}</p>
                </div>
              ))}
            </div>
            <div className="rounded-card bg-card p-4">
              <h3 className="mb-2 text-[13px] font-extrabold">{t("player.seasonStory")}</h3>
              <p className="text-[12px] leading-relaxed text-white/80">
                {player.name} has been {player.rating >= 8.5 ? "unplayable" : "one of the most reliable performers"} this
                season — {player.goals} goals and {player.assists} assists in all competitions, averaging a{" "}
                <span className="font-bold text-accent">{player.rating.toFixed(1)} match rating</span>. Fans on JUM voted
                this player <span className="font-bold text-accent2">#{Math.max(1, 12 - Math.round(player.rating))} in the world form chart</span>{" "}
                this week.
              </p>
            </div>
          </>
        )}

        {tab === "Lifestyle" && (
          <>
            <p className="text-[11px] text-dim">Premium lifestyle drops — the life beyond the pitch.</p>
            <div className="grid grid-cols-2 gap-3">
              {lifestyle.map((p) => (
                <LifestyleCard key={p.id} post={p} />
              ))}
            </div>
          </>
        )}

        {tab === "News" && (
          <div className="space-y-3">
            {[
              `${player.name} shortlisted for Player of the Month after another decisive run`,
              `${team?.name ?? "His club"} coach: "${player.name} sets the standard in training every single day"`,
              `Fans react: is ${player.name} the most underrated star in ${league?.name ?? "the league"}?`,
              `Inside the contract talks: what ${player.name}'s next deal could look like`,
            ].map((t, i) => (
              <article key={i} className="rounded-card bg-card p-4">
                <h4 className="text-[13px] font-bold leading-snug">{t}</h4>
                <p className="mt-1.5 text-[10px] text-dim">
                  {["2 h ago", "6 h ago", "1 d ago", "2 d ago"][i]} · JUM Football desk
                </p>
              </article>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
