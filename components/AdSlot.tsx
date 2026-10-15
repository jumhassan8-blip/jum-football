"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { usePro } from "@/lib/usePro";
import { useAuth } from "@/lib/auth-context";
import { useAdConfig, type AdPos } from "@/lib/adConfig";

// ─────────────────────────────────────────────────────────────
// JUM Football · AdSlot — the ONLY way an ad renders in this app.
//
//
// Render order: PRO → null (decided before mount, no flicker) ·
// no config → labeled gray placeholder · real → labeled <ins>.
// Dedupe: one pos per page. Unfilled ads collapse cleanly.
// AdSense policy: "ADVERTISEMENT" label is NEVER omitted.
// ─────────────────────────────────────────────────────────────

// Zero hardcoded slot IDs (§2): config comes ONLY from Firestore
// config/adsense (admin panel) or NEXT_PUBLIC_ADSENSE_* env. Missing
// config → labeled gray placeholder, never a fabricated <ins>.
const DEFAULT_SLOTS: Record<AdPos, string> = {
  top: "",
  infeed: "",
  sidebar: "",
  mobileSticky: "",
};

const MIN_H: Record<AdPos, string> = {
  top: "min-h-[100px]",
  infeed: "min-h-[250px]",
  sidebar: "min-h-[250px]",
  mobileSticky: "min-h-[50px]",
};

// rendered-pos registry: at most one of each pos per page, even if a
// caller mounts AdSlot twice (e.g. watch-room ad break re-mount).
const renderedPos = new Set<AdPos>();

export function resetAdSlotsForTest(): void {
  renderedPos.clear();
}

// ── placement-map enforcement (§2 — in code, not convention) ──
// Router-aware: /match/[id] forbids ads above the score header and the
// sticky (accidental-click policy), and caps every page at 3 slots.
const FORBIDDEN_BY_PATH: [RegExp, AdPos[]][] = [
  [/^\/match\/[^/]+/, ["top", "mobileSticky"]],
];
const MAX_ADS_PER_PAGE = 3;

export function posAllowed(pos: AdPos, pathname: string): boolean {
  for (const [re, blocked] of FORBIDDEN_BY_PATH) {
    if (re.test(pathname) && blocked.includes(pos)) return false;
  }
  return true;
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
    __jumAdTest?: boolean; // admin "Test render" forces real-mode preview
  }
}

/** AdSense policy label — never omitted, placeholder mode included. */
function AdLabel({ text }: { text: string }) {
  return (
    <span className="mb-1 block text-center text-[10px] font-bold uppercase tracking-[0.2em] text-dim/60">
      {text}
    </span>
  );
}

function RealIns({ clientId, slot, pos }: { clientId: string; slot: string; pos: AdPos }) {
  const t = useT();
  const insRef = useRef<HTMLModElement | null>(null);
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;
    // unfilled collapse (AdSense sets data-ad-status="unfilled")
    const mo = new MutationObserver(() => {
      if (el.getAttribute("data-ad-status") === "unfilled") setUnfilled(true);
    });
    mo.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense not ready or blocked — the <ins> simply stays hidden */
    }
    return () => mo.disconnect();
  }, []);

  if (unfilled) return null; // no white hole
  return (
    <div className={`overflow-hidden ${MIN_H[pos]}`}>
      <AdLabel text={t("common.advertisement")} />
      <div className="overflow-hidden rounded-xl">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={clientId}
          data-ad-slot={slot}
          data-ad-format={pos === "infeed" ? "fluid" : "auto"}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}

/** Monetization surface (§2): no AdSense config yet → JUM PRO promo
 *  card in the same slot (routes to /pro/checkout; slot renders null
 *  for PRO users before this ever mounts). Never shows "AD SPACE". */
function PromoCard({ pos }: { pos: AdPos }) {
  const t = useT();
  return (
    <Link
      href="/pro/checkout/"
      className={`flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 ring-1 ring-accent/20 transition-colors hover:border-accent/50 ${MIN_H[pos]}`}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-extrabold text-white">
          {t("promo.title")}
        </p>
        <p className="truncate text-[11px] font-semibold text-accent">
          {t("promo.subtitle")}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-[11px] font-black text-bg">
        {t("promo.cta")}
      </span>
    </Link>
  );
}

function readClosed(): boolean {
  try {
    return (
      sessionStorage.getItem("hideAds") === "1" ||
      sessionStorage.getItem("jum-ad-sticky-closed") === "1"
    );
  } catch {
    return false;
  }
}

function MobileStickyAd({
  clientId,
  slot,
}: {
  clientId: string;
  slot: string;
}) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [closed, setClosed] = useState(() => readClosed());
  const [confirmed, setConfirmed] = useState(false);
  const [pulse, setPulse] = useState(0);

  // an in-place close stays gone on the SAME surface; it also dispatches
  // a jum-ad-sticky event so any other live AdSlot instance on the
  // page clears instantly (dedupe holds one per page, but PRO toggles
  // and remounts can run several). AdSense auto-refresh can rebuild
  // the element later — the confirm window + pulse re-check catch any
  // resurrection before a visible flash.
  useEffect(() => {
    setConfirmed(true);
    const sync = () => setClosed(readClosed());
    window.addEventListener("jum-ad-sticky", sync);
    // observe only this banner subtree — body-wide observation re-fires
    // on every React commit and starves the main thread
    const root = rootRef.current;
    const mo = new MutationObserver(() => setPulse((p) => p + 1));
    if (root) mo.observe(root, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("jum-ad-sticky", sync);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (confirmed && pulse > 0 && readClosed()) setClosed(true);
  }, [pulse, confirmed]);

  if (closed) return null;
  if (!confirmed && readClosed()) return null; // anti-flash gate

  if (closed) return null;

  const close = () => {
    setClosed(true);
    try {
      sessionStorage.setItem("hideAds", "1");
      sessionStorage.setItem("jum-ad-sticky-closed", "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("jum-ad-sticky"));
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ height: 68 }}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
    >
      <div className="relative mx-auto h-full w-full max-w-[480px] bg-[#15151A]">
        <AdLabel text={t("common.adLabel")} />
        <div className="relative h-[50px]">
          {clientId && slot ? (
            <RealIns clientId={clientId} slot={slot} pos="mobileSticky" />
          ) : (
            <PromoCard pos="mobileSticky" />
          )}
        </div>
        <button
          onClick={close}
          aria-label={t("common.adClose")}
          className="absolute -top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-dim ring-1 ring-divider transition-colors hover:text-white"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

export default function AdSlot({ pos }: { pos: AdPos }) {
  const { isPro } = usePro();
  const { config, loaded } = useAdConfig();
  const pathname = usePathname();
  const [dup, setDup] = useState(false);
  const [overCap, setOverCap] = useState(false);
  const [proFs, setProFs] = useState(false);
  const t = useT();

  // Premium, layer 2: users/{uid}/pro.active from Firestore. localStorage
  // is the offline cache for the pre-paint decision; once auth is ready
  // the Firestore doc is authoritative. Fail-closed: errors → no gating.
  const { user, ready: authReady } = useAuth();
  useEffect(() => {
    let cancelled = false;
    if (!authReady || !user) return;
    (async () => {
      try {
        const { getFirestoreDb } = await import("@/lib/firebase");
        const db = await getFirestoreDb();
        if (!db || cancelled) return;
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!cancelled && snap.get("pro.active") === true) setProFs(true);
      } catch {
        /* fail closed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  // one pos per page + max-3-per-page + placement map — BEFORE render
  useEffect(() => {
    if (!posAllowed(pos, pathname ?? "/")) return; // forbidden → render nothing
    if (renderedPos.has(pos)) {
      setDup(true);
      return;
    }
    if (renderedPos.size >= MAX_ADS_PER_PAGE) {
      setOverCap(true);
      return;
    }
    renderedPos.add(pos);
    return () => {
      renderedPos.delete(pos);
    };
  }, [pos, pathname]);

  // Premium: either layer true → zero ads, decided pre-paint
  if (isPro || proFs) return null;
  if (dup || overCap) return null;

  const forced = typeof window !== "undefined" && !!window.__jumAdTest;
  const clientId = config.clientId;
  // spec defaults apply when Firestore has no override for this pos
  const slot = config.slots[pos] || DEFAULT_SLOTS[pos];
  const real = forced || Boolean(loaded && clientId);

  if (pos === "mobileSticky") {
    return (
      <div className="mx-auto my-4 max-w-[480px] px-0">
        <MobileStickyAd clientId={clientId} slot={slot} />
      </div>
    );
  }

  if (pos === "sidebar") {
    return (
      <div className="sticky top-20 mx-auto my-4 hidden w-[300px] lg:block">
        <div className="mx-4 rounded-xl">
          <AdLabel text={t("common.advertisement")} />
          {real ? (
            <RealIns clientId={clientId} slot={slot} pos="sidebar" />
          ) : (
            <PromoCard pos="sidebar" />
          )}
        </div>
      </div>
    );
  }

  // top / infeed
  return (
    <div className="mx-auto my-4 max-w-[480px] px-3">
      <div className="overflow-hidden rounded-xl">
        {real ? (
          <RealIns clientId={clientId} slot={slot} pos={pos} />
        ) : (
          <>
            <AdLabel text={t("common.advertisement")} />
            <PromoCard pos={pos} />
          </>
        )}
      </div>
    </div>
  );
}
