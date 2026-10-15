"use client";

import AdSlot from "./AdSlot";
import type { AdPos } from "@/lib/adConfig";

/**
 * Banner ad surface — thin alias over AdSlot. Legacy variant prop
 * (top | mid | bottom) keeps existing call sites working; AdSlot owns
 * config, labels, PRO gating and per-pos dedupe.
 */
const MAP: Record<string, AdPos> = {
  top: "top",
  mid: "infeed",
  bottom: "mobileSticky",
};

export default function AdBanner({ variant }: { variant: "top" | "mid" | "bottom" }) {
  return <AdSlot pos={MAP[variant]} />;
}
