"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, Flame, Search } from "lucide-react";
import { getMatches } from "@/lib/api";
import { useStreak } from "@/lib/store";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

/** Quick-links row — the global entry to every JUM hub. */
const QUICK_LINKS: { href: string; labelKey: string }[] = [
  { href: "/match/", labelKey: "nav.match" },
  { href: "/live/", labelKey: "nav.live" },
  { href: "/stats/", labelKey: "nav.stats" },
  { href: "/referee/", labelKey: "fanintel.nav.referees" },
  { href: "/pressure/", labelKey: "fanintel.nav.pressure" },
];

export default function Header() {
  const t = useT();
  const pathname = usePathname();
  const [liveCount, setLiveCount] = useState(0);
  const { count: streak } = useStreak();
  useEffect(() => {
    getMatches().then((ms) => setLiveCount(ms.filter((m) => m.status === "live").length));
  }, []);

  return (
    <header className="glass-header sticky top-0 z-40 flex h-14 items-center justify-between px-3">
      <Link
        href="/profile/"
        aria-label={t("profile.title")}
        className="flex h-11 w-11 items-center justify-center rounded-full text-dim transition-colors hover:text-white"
      >
        <CircleUserRound size={23} />
      </Link>

      <Link href="/match/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[15px] font-black text-bg">
          J
        </span>
        <span className="text-[16px] font-extrabold tracking-tight text-white">
          JUM <span className="text-accent">Football</span>
        </span>
        {liveCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-black text-accent">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
            {t("common.live")} {liveCount}
          </span>
        )}
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/follow/"
          aria-label="Streak"
          className="flex h-8 items-center gap-1 rounded-full bg-accent/10 px-2.5 text-[11px] font-black text-accent"
        >
          <Flame size={13} strokeWidth={2.5} />
          {streak}
        </Link>
        <Link
          href="/search/"
          aria-label={t("common.search")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-dim transition-colors hover:text-white"
        >
          <Search size={21} />
        </Link>
      </div>

      {/* quick-links row */}
      <nav
        aria-label="Quick links"
        className="no-scrollbar flex gap-1 overflow-x-auto border-t border-divider/60 px-2 py-1.5"
      >
        {QUICK_LINKS.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-dim hover:bg-white/5 hover:text-white"
              }`}
            >
              {t(l.labelKey)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
