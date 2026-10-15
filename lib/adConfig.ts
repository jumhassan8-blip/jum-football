"use client";

// ─────────────────────────────────────────────────────────────
// JUM Football · AdSense config loader.
// Reads config/adsense (Firestore doc) via the existing config path —
// no slot IDs hardcoded in components. Falls back to the
// NEXT_PUBLIC_ADSENSE_* env vars (build-time template) so a project
// without Firestore access still serves ads. Missing both →
// placeholder mode everywhere (handled by AdSlot).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { publicEnv } from "./env";

export type AdPos = "top" | "infeed" | "sidebar" | "mobileSticky";

export type AdSenseConfig = {
  clientId: string;
  slots: Record<AdPos, string>;
};

export const EMPTY_AD_CONFIG: AdSenseConfig = {
  clientId: "",
  slots: { top: "", infeed: "", sidebar: "", mobileSticky: "" },
};

function clean(v: string | undefined): string {
  const s = (v ?? "").trim();
  return s && !/paste|your|xxxx|placeholder|example/i.test(s) ? s : "";
}

/** Build-time fallback (env template) — the pre-Firestore path. */
function envConfig(): AdSenseConfig {
  return {
    clientId: clean(publicEnv.adsense.client),
    slots: {
      top: clean(publicEnv.adsense.slotTop),
      infeed: clean(publicEnv.adsense.slotMiddle),
      sidebar: clean(publicEnv.adsense.slotSidebar),
      mobileSticky: clean(publicEnv.adsense.slotSticky),
    },
  };
}

// module-level cache: one Firestore read per session, fail-closed
let cached: AdSenseConfig | null = null;
let inflight: Promise<AdSenseConfig> | null = null;
const listeners = new Set<(c: AdSenseConfig) => void>();

function normalize(raw: unknown): AdSenseConfig | null {
  const r = raw as { clientId?: unknown; adSlots?: Record<string, unknown> } | null;
  if (!r || typeof r.clientId !== "string") return null;
  const s = r.adSlots ?? {};
  const pick = (k: AdPos) => (typeof s[k] === "string" ? clean(s[k] as string) : "");
  return {
    clientId: clean(r.clientId),
    slots: { top: pick("top"), infeed: pick("infeed"), sidebar: pick("sidebar"), mobileSticky: pick("mobileSticky") },
  };
}

async function loadFromFirestore(): Promise<AdSenseConfig | null> {
  try {
    const { getFirestoreDb } = await import("./firebase");
    const db = await getFirestoreDb();
    if (!db) return null;
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "config", "adsense"));
    if (!snap.exists()) return null;
    return normalize(snap.data());
  } catch {
    return null; // offline / demo / egress blocked — env fallback below
  }
}

async function load(): Promise<AdSenseConfig> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const fromFs = await loadFromFirestore();
    cached = fromFs ?? envConfig();
    // notify any hook instances that resolved before the load finished
    listeners.forEach((fn) => fn(cached!));
    return cached!;
  })();
  return inflight;
}

/** Firestore wins; env is the fallback. SSR-safe (first read happens in an effect). */
export function useAdConfig(): { config: AdSenseConfig; loaded: boolean } {
  const [config, setConfig] = useState<AdSenseConfig>(cached ?? EMPTY_AD_CONFIG);
  const [loaded, setLoaded] = useState(cached !== null);
  useEffect(() => {
    let alive = true;
    const apply = (c: AdSenseConfig) => {
      if (!alive) return;
      setConfig(c);
      setLoaded(true);
    };
    if (cached) {
      apply(cached);
    } else {
      listeners.add(apply);
      void load().then(apply).catch(() => apply(envConfig()));
    }
    return () => {
      alive = false;
      listeners.delete(apply);
    };
  }, []);
  return { config, loaded };
}

/** Admin save → refresh the module cache + all live hooks. */
export function applyAdConfig(next: AdSenseConfig) {
  cached = next;
  listeners.forEach((fn) => fn(next));
}
