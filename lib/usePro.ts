"use client";

import { useCallback, useEffect, useState } from "react";

export const PRO_KEY = "jum-pro";

export function readPro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PRO_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Shared PRO state (mock checkout today — config flag for real Stripe later).
 * Backed by localStorage "jum-pro"; every instance syncs via jum-store-change.
 */
export function usePro() {
  const [isPro, setIsPro] = useState(false);
  useEffect(() => {
    setIsPro(readPro());
    const sync = () => setIsPro(readPro());
    window.addEventListener("jum-store-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jum-store-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const setPro = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PRO_KEY, "true");
    window.dispatchEvent(new Event("jum-store-change"));
  }, []);
  return { isPro, setPro };
}
