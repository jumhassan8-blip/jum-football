"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CloudOff, Flame, Globe, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AdSlot from "@/components/AdSlot";
import { useT } from "@/lib/i18n";

type Story = {
  id: string;
  title: string;
  image: string;
  source: string;
  publishedAt: string;
  link: string;
};
type NewsResponse = { items: Story[]; lastUpdated: string; stale: boolean };

const TABS = ["Headline", "World Cup", "Hot", "Transfers"] as const;

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

/** Real headline row: thumbnail, 2-line title, source badge, time ago. */
function StoryRow({ item }: { item: Story }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 border-b border-divider px-4 py-3 transition hover:bg-white/[0.03]"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card bg-white/5">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[22px]">⚽</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-snug">{item.title}</h3>
        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-black text-accent">
            {item.source}
          </span>
          <span className="ml-auto text-dim/70">{timeAgo(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const t = useT();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Headline");
  const [data, setData] = useState<NewsResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const ptrStart = useRef<number | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/news", { cache: "no-store" });
      setData((await res.json()) as NewsResponse);
    } catch {
      /* keep last state */
    }
  };

  useEffect(() => {
    void load();
    let iv: ReturnType<typeof setInterval> | null = setInterval(
      () => void load(),
      15 * 60_000 // match server cache
    );
    // §5: pause polling while the tab is hidden
    const onVis = () => {
      if (document.hidden) {
        if (iv) clearInterval(iv);
        iv = null;
      } else if (!iv) {
        void load();
        iv = setInterval(() => void load(), 15 * 60_000);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (iv) clearInterval(iv);
    };
  }, []);

  /* pull-to-refresh */
  useEffect(() => {
    const el = document.documentElement;
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) ptrStart.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (ptrStart.current !== null && e.touches[0].clientY - ptrStart.current > 90) {
        ptrStart.current = null;
        setRefreshing(true);
        void load().finally(() => setTimeout(() => setRefreshing(false), 500));
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
    };
  }, []);

  const items = data?.items ?? [];
  const trending = items.slice(0, 10); // 10 most recent across sources
  const latest = items.slice(10);
  const filtered =
    tab === "Headline"
      ? latest
      : latest.filter((s) =>
          tab === "World Cup"
            ? /world cup|fifa|qualifier/i.test(s.title)
            : tab === "Hot"
              ? true
              : /transfer|sign|contract|fee/i.test(s.title)
        );

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdSlot pos="top" />
      </div>

      <div className="sticky top-14 z-30 border-b border-divider bg-bg/95 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-lg items-center overflow-x-auto lg:max-w-3xl">
          {TABS.map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`relative min-h-[44px] shrink-0 px-4 text-[13px] font-semibold transition-colors ${
                tab === tb ? "text-accent" : "text-dim hover:text-white"
              }`}
            >
              {tb}
              {tab === tb && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
          <button
            onClick={() => {
              setRefreshing(true);
              void load().finally(() => setTimeout(() => setRefreshing(false), 500));
            }}
            aria-label={t("news.pullToRefresh")}
            className="ms-auto me-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={14} className={refreshing ? "refreshing" : ""} />
          </button>
        </div>
      </div>

      {data?.stale && (
        <div className="mx-auto mt-2 flex max-w-lg items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] font-bold text-dim ring-1 ring-divider lg:max-w-3xl">
          <CloudOff size={14} className="shrink-0" />
          {t("news.offline")}
        </div>
      )}

      <main className="mx-auto max-w-lg lg:max-w-3xl">
        <section>
          <h2 className="flex items-center gap-1.5 px-4 pt-4 text-[13px] font-bold text-orange-400">
            <Flame size={14} />
            Trending — 24h Top News
          </h2>
          <div className="mt-1.5 rounded-card bg-card">
            {trending.slice(0, 5).map((n, i) => (
              <div key={n.id}>
                <StoryRow item={n} />
                {i === 2 && (
                  <div className="border-b border-divider py-1">
                    <AdSlot pos="infeed" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="py-4 text-center">
            <Link href="/news/trending/" className="text-[13px] font-semibold text-accent">
              All Trending News &gt;
            </Link>
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-1.5 px-4 pb-1.5 text-[13px] font-bold text-accent2">
            <Globe size={14} />
            Latest News
          </h2>
          <div className="rounded-card bg-card">
            {filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-dim">
                {refreshing ? "…" : t("news.offline")}
              </p>
            )}
            {filtered.map((n) => (
              <StoryRow key={n.id} item={n} />
            ))}
          </div>
        </section>
      </main>

      {/* reserved space for the fixed sticky ad — no content overlap */}
      <div className="h-[50px]" aria-hidden />
      <AdSlot pos="mobileSticky" />
      <BottomNav />
    </div>
  );
}
