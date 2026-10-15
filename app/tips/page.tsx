"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Clock,
  Flame,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  BellRing,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
// §4: analysts collection — structure ships, data starts EMPTY.
// (was: fabricated Tipsters with fake streaks/hit-rates/prices)
export interface TipPick {
  matchId: string;
  call: string;
  reasoning: string;
  confidence: number;
}
export interface Tipster {
  id: string;
  name: string;
  handle: string;
  streak: string;
  hitRate: string;
  matchIds: string[];
  pickBadges: string[];
  purchased: number;
  hoursAgo: number;
  priceOld: string;
  priceNew: string;
  price: number;
  picks: TipPick[];
  history: { result: "W" | "L"; pick: string }[];
}
import { getMatches, teamById } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useToast } from "@/lib/store";
import Header from "@/components/Header";
import AdBanner from "@/components/AdBanner";
import BottomNav from "@/components/BottomNav";
import Sheet from "@/components/Sheet";
import JumAd from "@/components/JumAd";
import TeamLogo from "@/components/TeamLogo";

const PURCHASED_KEY = "jum-purchased-tips";
const FOLLOWED_TIPSTERS_KEY = "jum-followed-tipsters";
const PRO_KEY = "jum-pro";

type FilterKey = "recommend" | "accuracy" | "free";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

async function confettiBurst() {
  try {
    const mod = await import("canvas-confetti");
    (mod.default ?? mod)({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.7 },
      colors: ["#B4FF39", "#ffffff", "#FF4D4D"],
    });
  } catch {
    /* confetti is decorative */
  }
}

function usePro(): [boolean, () => void] {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    const sync = () => setPro(readJSON(PRO_KEY, false));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return [
    pro,
    () => {
      writeJSON(PRO_KEY, true);
      setPro(true);
      window.dispatchEvent(new Event("storage"));
    },
  ];
}

export default function TipsPage() {
  return (
    <Suspense fallback={null}>
      <TipsInner />
    </Suspense>
  );
}

function TipsInner() {
  const params = useSearchParams();
  const matchFilter = params.get("match");
  const t = useT();
  const toast = useToast();
  const [isPro, activatePro] = usePro();
  const [filter, setFilter] = useState<FilterKey>("recommend");
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [ticker, setTicker] = useState<{ id: string; label: string }[]>([]);
  const [allMatches, setAllMatches] = useState<{ id: string; label: string }[]>([]);
  const [spinning, setSpinning] = useState(false);
  /** ids of fixtures currently LIVE from the real API */
  const [liveFixtureIds, setLiveFixtureIds] = useState<Set<string>>(new Set());

  // paywall / unlocked / pro / hit-rate sheets
  const [paywallTipster, setPaywallTipster] = useState<Tipster | null>(null);
  const [viewTipster, setViewTipster] = useState<Tipster | null>(null);
  const [proSheetOpen, setProSheetOpen] = useState(false);
  const [hitRateOpen, setHitRateOpen] = useState(false);

  // purchase state
  const [ageOk, setAgeOk] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedFlash, setUnlockedFlash] = useState(false);

  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  useEffect(() => {
    setPurchasedIds(readJSON(PURCHASED_KEY, []));
    setFollowedIds(readJSON(FOLLOWED_TIPSTERS_KEY, []));
    // §4: analysts collection starts EMPTY — structure stays, data is real-or-none
    setTipsters([]);
    // real fixtures → LIVE chips; silent mock fallback when football is quiet
    fetch("/api/live", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { fixtures?: { fixture: { id: number; status: { short: string } }; league: { name: string } }[] }) => {
        const live = new Set<string>();
        for (const f of json.fixtures ?? []) {
          const s = f.fixture.status.short;
          if (s === "1H" || s === "2H" || s === "HT") live.add(String(f.fixture.id));
        }
        setLiveFixtureIds(live);
      })
      .catch(() => {});
    getMatches().then((ms) => {
      const labels = ms.map((m) => ({
        id: m.id,
        label: `${teamById(m.homeId)!.short} vs ${teamById(m.awayId)!.short}`,
      }));
      setAllMatches(labels);
      // §1: no fabricated "N analysts" counts — ticker is a pure match
      // quick-filter sourced from fixtures only.
      setTicker(
        ms
          .filter((m) => m.status === "live")
          .map((m) => ({
            id: m.id,
            label: `${teamById(m.homeId)!.short} vs ${teamById(m.awayId)!.short}`,
          }))
      );
    });
  }, []);

  const matchLabel = (id: string) => allMatches.find((x) => x.id === id)?.label ?? id;

  const list = useMemo(() => {
    let out = tipsters;
    if (matchFilter) out = out.filter((x) => x.matchIds.includes(matchFilter));
    if (filter === "accuracy") {
      out = [...out].sort((a, b) => parseInt(b.hitRate) - parseInt(a.hitRate));
    }
    if (filter === "free") out = out.filter((x) => x.price === 0);
    return out;
  }, [tipsters, filter, matchFilter]);

  const refresh = () => {
    setSpinning(true);
    setTipsters((prev) => [...prev].sort((a, b) => parseInt(b.hitRate) - parseInt(a.hitRate)));
    setTimeout(() => setSpinning(false), 700);
  };

  const toggleFollow = (tip: Tipster) => {
    const next = followedIds.includes(tip.id)
      ? followedIds.filter((id) => id !== tip.id)
      : [...followedIds, tip.id];
    setFollowedIds(next);
    writeJSON(FOLLOWED_TIPSTERS_KEY, next);
    if (!followedIds.includes(tip.id)) toast(t("tips.followingToast", { name: tip.name }));
  };

  /** Entry point: View Analysis / View / free → decides paywall vs unlocked. */
  const openTip = (tip: Tipster) => {
    if (tip.price === 0 || isPro || purchasedIds.includes(tip.id)) {
      setViewTipster(tip);
      return;
    }
    setAgeOk(false);
    setUnlocking(false);
    setUnlockedFlash(false);
    setPaywallTipster(tip);
  };

  const completeUnlock = (tip: Tipster) => {
    const next = [...new Set([...purchasedIds, tip.id])];
    setPurchasedIds(next);
    writeJSON(PURCHASED_KEY, next);
    void confettiBurst();
    setUnlockedFlash(true);
    toast(t("tips.unlockedToast"));
    setTimeout(() => {
      setPaywallTipster(null);
      setViewTipster(tip);
      setUnlockedFlash(false);
    }, 1000);
  };

  const unlock = (tip: Tipster) => {
    if (!ageOk || unlocking) return;
    setUnlocking(true);
    setTimeout(() => completeUnlock(tip), 800);
  };

  const shareAnalysis = async (tip: Tipster) => {
    const calls = tip.picks.map((p: TipPick) => p.call).join(" · ");
    const text = t("tips.shareText", { name: tip.name, picks: calls });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "JUM Football", text });
        return;
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(text);
    } catch {
      /* noop */
    }
  };

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "recommend", label: t("tips.filters.recommend") },
    { key: "accuracy", label: t("tips.filters.accuracy") },
    { key: "free", label: t("tips.filters.free") },
  ];

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto flex max-w-lg justify-center pt-2 lg:max-w-3xl">
        <AdBanner variant="top" />
      </div>

      <main className="mx-auto max-w-lg px-4 pt-3 lg:max-w-3xl">
        {/* ticker */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {ticker.map((x) => (
            <button
              key={x.id}
              onClick={() => (window.location.href = `/tips/?match=${x.id}`)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ${
                matchFilter === x.id
                  ? "bg-accent/10 text-accent ring-accent/40"
                  : "bg-card text-dim ring-divider"
              }`}
            >
              <Flame size={11} className="text-orange-400" />
              {x.label}
            </button>
          ))}
        </div>

        {/* pro banner */}
        <button
          onClick={() => setProSheetOpen(true)}
          className="mt-3 flex w-full items-center gap-2.5 rounded-card bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-3 text-left active:opacity-90"
        >
          <Lock size={18} className="shrink-0 text-white" />
          <span className="flex-1 text-[13px] font-black tracking-wide text-white">
            {t("tips.proBanner")}
          </span>
          <span className="text-[11px] font-bold text-white/80">{t("tips.proBannerHint")}</span>
        </button>

        <p className="mt-2 text-center text-[10px] leading-relaxed text-dim/70">
          {t("tips.disclaimer")}
        </p>

        {/* filters + refresh */}
        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-[36px] shrink-0 rounded-full px-4 text-[12px] font-bold transition-colors ${
                filter === f.key
                  ? "bg-accent text-bg"
                  : "bg-card text-dim ring-1 ring-divider hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          {matchFilter && (
            <Link
              href="/tips/"
              className="flex min-h-[36px] shrink-0 items-center rounded-full bg-card px-3 text-[11px] font-bold text-live ring-1 ring-divider"
            >
              {t("tips.clearMatch")}
            </Link>
          )}
          <button
            onClick={refresh}
            aria-label={t("a11y.refreshScores")}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-dim ring-1 ring-divider active:scale-90"
          >
            <RefreshCw size={15} className={spinning ? "animate-spin" : ""} />
          </button>
        </div>

        {/* cards */}
        <div className="mt-3.5 space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((tip, i) => {
              const owned = isPro || tip.price === 0 || purchasedIds.includes(tip.id);
              const followed = followedIds.includes(tip.id);
              return (
                <motion.div
                  key={tip.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                >
                  <article className="rounded-card bg-card p-3 ring-1 ring-divider">
                    <div className="flex items-center gap-2.5">
                      <TeamLogo team={tip.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{tip.name}</p>
                        <p className="text-[11px] text-dim/70">@{tip.handle}</p>
                      </div>
                      <button
                        onClick={() => setHitRateOpen(true)}
                        className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent active:scale-95"
                      >
                        <Flame size={10} />
                        {tip.streak}
                      </button>
                      <button
                        onClick={() => toggleFollow(tip)}
                        aria-label={followed ? t("tips.following") : t("tips.follow")}
                        aria-pressed={followed}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90 ${
                          followed
                            ? "bg-accent text-bg"
                            : "bg-white/5 text-dim ring-1 ring-divider hover:text-white"
                        }`}
                      >
                        <UserPlus size={14} />
                      </button>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      {tip.matchIds.map((mid) => (
                        <p key={mid} className="flex items-center gap-1.5 truncate text-[12px] font-semibold text-dim">
                          {matchLabel(mid)}
                          {liveFixtureIds.has(mid.replace("m-", "")) && (
                            <span className="shrink-0 rounded-full bg-[#FF4D4D]/15 px-1.5 py-px text-[9px] font-black text-[#FF4D4D]">
                              {t("tips.liveNow")}
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tip.pickBadges.map((b) => (
                        <span
                          key={b}
                          className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent"
                        >
                          {b}
                        </span>
                      ))}
                      <button
                        onClick={() => setHitRateOpen(true)}
                        className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-dim active:scale-95"
                      >
                        {t("tips.hitRate", { rate: tip.hitRate })}
                        <Info size={9} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {owned ? (
                        <button
                          onClick={() => setViewTipster(tip)}
                          className="flex min-h-[38px] flex-1 items-center justify-center rounded-lg bg-accent/10 text-[12px] font-bold text-accent ring-1 ring-accent/50 transition-colors active:bg-accent/20"
                        >
                          {t("tips.view")}
                        </button>
                      ) : (
                        <button
                          onClick={() => openTip(tip)}
                          className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-[12px] font-bold text-bg transition-colors active:opacity-90"
                        >
                          <Lock size={12} />
                          {t("tips.viewAnalysis")}
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-dim/70">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {t("tips.hoursAgo", { h: tip.hoursAgo })} · <Users size={11} />{" "}
                        {t("tips.purchased", { count: tip.purchased })}
                      </span>
                      <span className="flex items-baseline gap-1.5">
                        {tip.price > 0 && <span className="line-through">{tip.priceOld}</span>}
                        <span className="text-[13px] font-black text-accent">{tip.priceNew}</span>
                      </span>
                    </div>
                  </article>
                  {i === Math.min(2, list.length - 1) && (
                    <div className="flex justify-center pt-3">
                      <AdBanner variant="mid" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {list.length === 0 && (
            /* §4 designed empty state — an honest shelf beats a fake store */
            <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-14 text-center ring-1 ring-divider">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/30">
                <BellRing size={24} className="text-accent" />
              </span>
              <p className="text-[15px] font-extrabold text-white">{t("tips.emptyTitle")}</p>
              <p className="max-w-[260px] text-[12px] leading-relaxed text-dim">
                {t("tips.emptyBody")}
              </p>
              <Link
                href="/follow/"
                className="mt-1 rounded-full bg-accent px-5 py-2 text-[12px] font-black text-bg transition-opacity active:opacity-80"
              >
                {t("tips.followTeamsCta")}
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* ═══ PAYWALL SHEET ═══ */}
      <Sheet
        open={!!paywallTipster}
        onClose={() => !unlocking && setPaywallTipster(null)}
        title={paywallTipster ? t("tips.paywallTitle") : ""}
      >
        {paywallTipster && (
          <div>
            <div className="flex items-center gap-2.5">
              <TeamLogo team={paywallTipster.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{paywallTipster.name}</p>
                <p className="text-[11px] text-dim/70">@{paywallTipster.handle}</p>
              </div>
              <span className="text-[13px] font-black text-accent">{paywallTipster.priceNew}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {paywallTipster.pickBadges.map((b) => (
                <span
                  key={b}
                  className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent"
                >
                  {b}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-dim/70">{t("tips.disclaimer")}</p>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
                className="h-4 w-4 accent-[#C8FF3D]"
              />
              <span className="text-[12px] font-bold">{t("tips.ageGate")}</span>
            </label>

            <button
              onClick={() => unlock(paywallTipster)}
              disabled={!ageOk || unlocking}
              className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition-colors ${
                unlockedFlash
                  ? "bg-accent text-bg"
                  : "bg-accent text-bg disabled:opacity-30"
              }`}
            >
              {unlocking && !unlockedFlash ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {t("tips.unlocking")}
                </>
              ) : unlockedFlash ? (
                <>
                  <Check size={15} strokeWidth={3.5} />
                  {t("tips.unlockedToast")}
                </>
              ) : (
                <>
                  <Lock size={13} />
                  {t("tips.unlockFor", { price: paywallTipster.priceNew })}
                </>
              )}
            </button>
          </div>
        )}
      </Sheet>

      {/* ═══ UNLOCKED ANALYSIS VIEW ═══ */}
      <Sheet
        open={!!viewTipster}
        onClose={() => setViewTipster(null)}
        title={viewTipster ? t("tips.analysisTitle") : ""}
      >
        {viewTipster && (
          <div>
            <div className="flex items-center gap-2.5">
              <TeamLogo team={viewTipster.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{viewTipster.name}</p>
                <p className="text-[11px] text-dim/70">@{viewTipster.handle}</p>
              </div>
              <button
                onClick={() => void shareAnalysis(viewTipster)}
                aria-label={t("common.share")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-dim ring-1 ring-divider active:scale-90"
              >
                <Share2 size={15} />
              </button>
            </div>

            {viewTipster.picks.map((p: TipPick) => (
              <div
                key={p.matchId}
                className="mt-3 rounded-xl bg-white/[0.04] p-3 ring-1 ring-divider"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-dim">
                  {matchLabel(p.matchId)}
                  {liveFixtureIds.has(p.matchId.replace("m-", "")) && (
                    <span className="rounded-full bg-[#FF4D4D]/15 px-1.5 py-px text-[9px] font-black text-[#FF4D4D]">
                      {t("tips.liveNow")}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[13px] font-black text-accent">{p.call}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/85">{p.reasoning}</p>
                <div className="mt-2.5">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-dim">{t("tips.confidence")}</span>
                    <span className="text-accent">{p.confidence}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.confidence}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-accent"
                    />
                  </div>
                </div>
              </div>
            ))}

            {viewTipster.price === 0 && !isPro && (
              <div className="mt-4 rounded-xl bg-accent/10 p-3 ring-1 ring-accent/30">
                <p className="text-[12px] font-bold">{t("tips.freeUpsell")}</p>
                <button
                  onClick={() => {
                    activatePro();
                    toast(t("tips.proActive"));
                  }}
                  className="mt-2 min-h-[38px] w-full rounded-full bg-accent text-[12px] font-black text-bg active:scale-[0.98]"
                >
                  {t("tips.freeUpsell")}
                </button>
              </div>
            )}
            {isPro && (
              <p className="mt-4 text-center text-[11px] font-bold text-accent">
                {t("tips.proActive")}
              </p>
            )}
          </div>
        )}
      </Sheet>

      {/* ═══ PRO UPSHEET (banner + free-tipsell share this) ═══ */}
      <Sheet
        open={proSheetOpen}
        onClose={() => setProSheetOpen(false)}
        title={t("tips.proBanner")}
      >
        <p className="text-[13px] leading-relaxed text-dim">{t("tips.proBannerHint")}</p>
        {isPro ? (
          <p className="mt-4 text-center text-[12px] font-bold text-accent">
            {t("tips.proActive")}
          </p>
        ) : (
          <button
            onClick={() => {
              activatePro();
              void confettiBurst();
              toast(t("tips.proActive"));
              setProSheetOpen(false);
            }}
            className="mt-4 min-h-[44px] w-full rounded-lg bg-accent text-[13px] font-black text-bg active:scale-[0.98]"
          >
            {t("tips.freeUpsell")}
          </button>
        )}
      </Sheet>

      {/* ═══ HIT-RATE EXPLAINER ═══ */}
      <Sheet
        open={hitRateOpen}
        onClose={() => setHitRateOpen(false)}
        title={t("tips.hitRateSheetTitle")}
      >
        <p className="text-[13px] leading-relaxed text-dim">{t("tips.hitRateSheetBody")}</p>
        <button
          onClick={() => setHitRateOpen(false)}
          className="mt-4 min-h-[44px] w-full rounded-lg bg-accent text-[13px] font-bold text-bg"
        >
          {t("common.close")}
        </button>
      </Sheet>

      <BottomNav />
      <JumAd type="sticky" />
    </div>
  );
}
