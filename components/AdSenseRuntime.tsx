"use client";

import Script from "next/script";
import { useAdConfig } from "@/lib/adConfig";

/**
 * Loads adsbygoogle.js exactly ONCE per session (next/script,
 * afterInteractive) using the clientId from config (Firestore
 * config/adsense with env fallback). Per-slot pushes live in AdSlot.
 * The slot-ID dedupe from the previous build is no longer needed:
 * AdSlot dedupes by pos key, which is strictly stronger.
 */
export default function AdSenseRuntime() {
  const { config } = useAdConfig();

  if (!config.clientId) return null;

  return (
    <Script
      id="jum-adsense-client"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.clientId}`}
    />
  );
}
