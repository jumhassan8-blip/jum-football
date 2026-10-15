"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AdBanner from "@/components/AdBanner";
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

const PAGE_SIZE = 5;

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export default function TrendingPage() {
  const t = useT();
  const [items, setItems] = useState<Story[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/news", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: NewsResponse) => setItems(d.items.slice(0, 10))) // 10 most recent
      .catch(() => {});
  }, []);

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      <div className="border-b border-divider bg-card">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3 lg:max-w-3xl">
          <Link
            href="/news/"
            aria-label={t("a11y.backToNews")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="flex items-center gap-1.5 text-[15px] font-extrabold text-orange-400">
            <Flame size={16} />
            All Trending News
          </h1>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 pt-4 lg:max-w-3xl">
        <div className="divide-y divide-divider rounded-card bg-card">
          {slice.map((n, i) => (
            <div key={n.id}>
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card bg-white/5">
                  {n.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.image} alt="" loading="lazy" className="h-full w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[22px]">⚽</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <h3 className="line-clamp-2 text-[13px] font-bold leading-snug">{n.title}</h3>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-black text-accent">
                      {n.source}
                    </span>
                    <span className="ml-auto text-dim/70">{timeAgo(n.publishedAt)}</span>
                  </div>
                </div>
              </a>
              {i === 2 && (
                <div className="flex justify-center py-2">
                  <AdBanner variant="mid" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="min-h-[40px] rounded-full bg-card px-4 text-[12px] font-bold text-dim ring-1 ring-divider disabled:opacity-30"
          >
            ← Newer
          </button>
          <span className="text-[12px] font-bold text-dim">
            Page {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="min-h-[40px] rounded-full bg-card px-4 text-[12px] font-bold text-dim ring-1 ring-divider disabled:opacity-30"
          >
            Older →
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
