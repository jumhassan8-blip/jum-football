"use client";

import AdSlot from "./AdSlot";
import type { AdPos } from "@/lib/adConfig";

/**
 * JUM ad surface — now a thin alias over AdSlot. Legacy call sites
 * (type="top" | "native" | "sticky") keep working; every render
 * decision (PRO, config, dedupe, labels) lives in AdSlot alone.
 */
const MAP: Record<string, AdPos> = {
  top: "top",
  native: "infeed",
  sticky: "mobileSticky",
};

export default function JumAd({ type }: { type: "top" | "native" | "sticky" }) {
  return <AdSlot pos={MAP[type]} />;
}
