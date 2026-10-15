// ─────────────────────────────────────────────────────────────
// JUM Football · server-only Stripe client.
// Guarded: importing this into client code throws at runtime (the
// `server-only` npm package would too, but it breaks under plain-Node
// runtimes like scripts/dev-server.mjs — this guard is equivalent and
// runtime-agnostic). Init happens lazily per request (static prerender
// never touches secrets). configMissing throws so callers map it to
// the 503 CONFIG_MISSING response.
// ─────────────────────────────────────────────────────────────

import Stripe from "stripe";
import { serverEnv } from "./env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).window !== "undefined") {
  throw new Error("lib/stripe-server.ts is server-only — do not import from client components");
}

export class ConfigMissingError extends Error {
  readonly missing: "stripeSecretKey" | "stripeFootballPriceId";
  constructor(missing: "stripeSecretKey" | "stripeFootballPriceId") {
    super(`missing env: ${missing}`);
    this.missing = missing;
  }
}

let cached: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (cached) return cached;
  const key = serverEnv("stripeSecretKey");
  if (!key) throw new ConfigMissingError("stripeSecretKey");
  cached = new Stripe(key);
  return cached;
}

/** Fail-closed: price id or ConfigMissingError. */
export function getProPriceId(): string {
  const id = serverEnv("stripeFootballPriceId");
  if (!id) throw new ConfigMissingError("stripeFootballPriceId");
  return id;
}
