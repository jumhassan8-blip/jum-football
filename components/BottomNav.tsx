"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Newspaper, Tv, Music2, BookmarkPlus, DollarSign, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { getMatches } from "@/lib/api";
import { useT } from "@/lib/i18n";

const NAV_KEYS: Record<string, string> = {
  "/news": "nav.news",
  "/live": "nav.live",
  "/match": "nav.match",
  "/follow": "nav.follow",
  "/tips": "nav.tips",
  "/stats": "nav.stats",
};
const NAV_HREFS = Object.keys(NAV_KEYS);
const NAV_ICONS: Record<string, typeof Newspaper> = {
  "/news": Newspaper,
  "/live": Tv,
  "/match": Music2,
  "/follow": BookmarkPlus,
  "/tips": DollarSign,
  "/stats": BarChart3,
};

export default function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const [liveCount, setLiveCount] = useState(0);
  useEffect(() => {
    getMatches().then((ms) => setLiveCount(ms.filter((m) => m.status === "live").length));
  }, []);

  return (
    <nav className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t border-divider bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch lg:max-w-3xl">
        {NAV_HREFS.map((href) => {
          const active = pathname.startsWith(href);
          const Icon = NAV_ICONS[href];
          const isLiveTab = href === "/live";
          return (
            <Link
              key={href}
              href={`${href}/`}
              className={`relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold tracking-wide transition-colors ${
                active ? "text-accent" : "text-dim hover:text-white"
              }`}
            >
              <span className="relative">
                {isLiveTab && active ? (
                  <motion.span
                    key="pulse"
                    animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-accent"
                  />
                ) : null}
                <Icon size={20} strokeWidth={active ? 2.5 : 2} className="relative" />
                {isLiveTab && liveCount > 0 && (
                  <span className="pulse-dot absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-live px-0.5 text-[8px] font-black text-white ring-2 ring-bg">
                    {liveCount}
                  </span>
                )}
              </span>
              {t(NAV_KEYS[href])}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
