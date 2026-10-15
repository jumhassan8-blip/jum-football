"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// EEA/UK cookie consent for AdSense + analytics. First visit → fixed
// bottom sheet; Accept persists in localStorage; Manage links to
// /privacy. Never blocks content (pointer-events only on the sheet).
// AdSense consent signals ship via the default-consent snippet in
// ConsentModeScript (root layout).
// ─────────────────────────────────────────────────────────────

const KEY = "jum-cookie-consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(KEY, "accepted");
    } catch {
      /* ignore */
    }
    try {
      window.gtag?.("consent", "update", { ad_storage: "granted", analytics_storage: "granted" });
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-24">
      <div className="mx-auto max-w-[480px] rounded-2xl border border-divider bg-card p-4 shadow-2xl shadow-black/60">
        <p className="text-[12px] font-bold text-white">We use cookies for ads &amp; analytics</p>
        <p className="pt-1 text-[11px] leading-relaxed text-dim">
          Google and partners use cookies to serve and measure ads. See our{" "}
          <Link href="/privacy/" className="text-accent underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={accept}
            className="min-h-[40px] flex-1 rounded-full bg-accent text-[12px] font-black text-bg"
          >
            Accept
          </button>
          <Link
            href="/privacy/"
            className="flex min-h-[40px] flex-1 items-center justify-center rounded-full bg-card text-[12px] font-black text-white ring-1 ring-divider"
          >
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}
