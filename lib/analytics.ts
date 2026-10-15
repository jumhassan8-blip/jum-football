"use client";

/**
 * Lightweight analytics bus. Events flow to gtag when present and are
 * always mirrored into window.dataLayer (GTM-compatible). Never throws —
 * analytics must never break a screen.
 *
 * Fan Intelligence events: referee_viewed, ref_filter_used,
 * pressure_viewed, dominating_badge_shown, ref_match_chip_tapped.
 */
export function trackEvent(name: string, params?: Record<string, string | number>) {
  try {
    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: Record<string, unknown>[];
    };
    (w.dataLayer = w.dataLayer ?? []).push({ event: name, ...(params ?? {}) });
    if (typeof w.gtag === "function") w.gtag("event", name, params ?? {});
  } catch {
    /* fail silent */
  }
}
