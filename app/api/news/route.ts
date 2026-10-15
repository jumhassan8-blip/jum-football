// ─────────────────────────────────────────────────────────────
// JUM Football · /api/news — real headlines, no API key, no quota.
// Aggregates RSS feeds (BBC Sport Football, ESPN FC, Goal.com —
// plus Sky Sports as an always-on backup), normalizes to
// { id, title, image, source, publishedAt, link }, merges by date.
// 15-min server cache. On total feed failure the last good batch is
// served with stale:true so the tab never goes empty.
// Completely bypasses the api-football 100/day quota.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import Parser from "rss-parser";

const TTL = 15 * 60_000; // 15 min
const FETCH_TIMEOUT_MS = 12_000;

const FEEDS: { source: string; url: string }[] = [
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { source: "ESPN FC", url: "https://www.espn.com/espn/rss/soccer/news" },
  { source: "GOAL", url: "https://www.goal.com/feeds/en/news" },
  { source: "Sky Sports", url: "https://www.skysports.com/rss/12098" } // football news backup (BBC/ESPN/GOAL are primaries),
];

export type NewsStory = {
  id: string;
  title: string;
  image: string;
  source: string;
  publishedAt: string; // ISO
  link: string;
};

let cache: { items: NewsStory[]; at: number } | null = null;
let inFlight: Promise<Response> | null = null;

// disk persistence: restarts keep the last good batch (tmp survives restarts)
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const DISK_CACHE = join(tmpdir(), "jum-news-cache.json");
try {
  const raw = JSON.parse(readFileSync(DISK_CACHE, "utf8")) as { items: NewsStory[]; at: number };
  if (Array.isArray(raw.items) && raw.items.length) cache = raw;
} catch {
  /* no disk cache yet */
}
function persistCache() {
  try {
    if (cache) writeFileSync(DISK_CACHE, JSON.stringify(cache));
  } catch {
    /* best effort */
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Tolerant ISO conversion — feed dates like "…BST" break new Date().toISOString(). */
function safeIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = Date.parse(v.replace(/\s(BST|GMT|UTC)$/, " +0000"));
  if (!Number.isNaN(t)) return new Date(t).toISOString();
  const raw = Date.parse(v);
  return Number.isNaN(raw) ? null : new Date(raw).toISOString();
}

function idFrom(link: string): string {
  let h = 0;
  for (let i = 0; i < link.length; i++) h = (h * 31 + link.charCodeAt(i)) >>> 0;
  return `n-${h.toString(36)}`;
}

/** rss-parser leaves namespaced tags like media:content on an `item` extension bag. */
function extractImage(item: Parser.Item & Record<string, unknown>): string {
  const enc = item.enclosure as { url?: string } | undefined;
  if (enc?.url) return enc.url;
  const mc = item["media:content"] as { url?: string } | undefined;
  if (mc?.url) return mc.url;
  const mt = item["media:thumbnail"] as { url?: string } | undefined;
  if (mt?.url) return mt.url;
  const img = item["content:encoded"] as string | undefined;
  const m = img?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? "";
}

async function fetchFeed(parser: Parser, source: string, url: string): Promise<NewsStory[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "user-agent": "JUMFootball/1.0 (+https://jumfootball.app)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${source} ${res.status}`);
  const xml = await res.text();
  if (!xml.includes("<item") && !xml.includes("<entry")) throw new Error(`${source} empty`);
  const feed = await parser.parseString(xml);
  return (feed.items ?? [])
    .slice(0, 20)
    .map((raw) => {
      const item = raw as Parser.Item & Record<string, unknown>;
      const title = stripHtml(item.title ?? "");
      const link = item.link ?? "";
      if (!title || !link) return null;
      const publishedAt = safeIso(item.isoDate) ?? safeIso(item.pubDate) ?? new Date().toISOString();
      return {
        id: idFrom(link),
        title,
        image: extractImage(item),
        source,
        publishedAt,
        link,
      } satisfies NewsStory;
    })
    .filter((s): s is NewsStory => s !== null);
}

async function handle(): Promise<Response> {
  const now = Date.now();
  if (cache && now - cache.at < TTL) {
    return NextResponse.json({ items: cache.items, lastUpdated: new Date(cache.at).toISOString(), stale: false });
  }
  if (inFlight) return (await inFlight).clone();

  inFlight = (async (): Promise<Response> => {
    const parser = new Parser();
    const settled = await Promise.allSettled(FEEDS.map((f) => fetchFeed(parser, f.source, f.url)));
    const items: NewsStory[] = [];
    for (const r of settled) if (r.status === "fulfilled") items.push(...r.value);

    if (items.length > 0) {
      // merge by date desc, dedupe by link
      const seen = new Set<string>();
      const merged = items
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .filter((s) => (seen.has(s.link) ? false : (seen.add(s.link), true)))
        .slice(0, 60);
      cache = { items: merged, at: Date.now() };
      persistCache();
      // push digest — ≤1/hour, deduped by link; never blocks the response
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — plain .mjs server module, not part of the web bundle
      import("../../../scripts/notifications-server.mjs")
        .then((m: { maybeNotifyNews?: (items: NewsStory[]) => void }) => m.maybeNotifyNews?.(merged))
        .catch(() => {});
      return NextResponse.json({ items: merged, lastUpdated: new Date().toISOString(), stale: false });
    }
    // total failure → last good batch, stale (never an empty tab upstream of this)
    if (cache) {
      return NextResponse.json({ items: cache.items, lastUpdated: new Date(cache.at).toISOString(), stale: true });
    }
    return NextResponse.json({ items: [], lastUpdated: new Date().toISOString(), stale: true });
  })();

  try {
    return (await inFlight).clone();
  } finally {
    setTimeout(() => {
      inFlight = null;
    }, 0);
  }
}

export async function GET() {
  try {
    return await handle();
  } catch {
    return NextResponse.json({
      items: cache?.items ?? [],
      lastUpdated: new Date().toISOString(),
      stale: true,
    });
  }
}
