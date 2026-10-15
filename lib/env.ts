// ─────────────────────────────────────────────────────────────
// JUM Football · typed env config — the ONLY module that reads
// process.env. Everyone else imports from here. Zero scattered
// process.env reads in app/components/lib (grep-enforced).
//
// Client boundary: anything reachable from a "use client" module may
// reference ONLY NEXT_PUBLIC_* names — those are inlined at build time
// and are safe to expose in the browser bundle.
//
// Server secrets read lazily via serverEnv() — never called during
// static prerender — so a missing secret fails closed with
// { code: "CONFIG_MISSING", status: 503 } instead of "undefined".
// ─────────────────────────────────────────────────────────────

/** Public client-safe config (NEXT_PUBLIC_* only — bundled into the client). */
export const publicEnv = {
  adsense: {
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
    slotTop: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP ?? "",
    slotMiddle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MIDDLE ?? "",
    slotSidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR ?? "",
    slotSticky: process.env.NEXT_PUBLIC_ADSENSE_SLOT_STICKY ?? "",
  },
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FB_FOOTBALL_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FB_FOOTBALL_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FB_FOOTBALL_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FB_FOOTBALL_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FB_FOOTBALL_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FB_FOOTBALL_APP_ID ?? "",
    vapidKey: process.env.NEXT_PUBLIC_FB_FOOTBALL_VAPID_KEY ?? "",
  },
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
} as const;

export type ServerEnvName =
  | "apiFootballKey"
  | "stripeSecretKey"
  | "stripeWebhookSecret"
  | "stripeFootballPriceId"
  | "fcmServerKey"
  | "firebaseServiceAccount";

const SERVER_VARS: Record<ServerEnvName, string> = {
  apiFootballKey: "API_FOOTBALL_KEY",
  stripeSecretKey: "STRIPE_SECRET_KEY",
  stripeWebhookSecret: "STRIPE_WEBHOOK_SECRET",
  stripeFootballPriceId: "STRIPE_FOOTBALL_PRICE_ID",
  fcmServerKey: "FCM_SERVER_KEY",
  firebaseServiceAccount: "FIREBASE_SERVICE_ACCOUNT",
};

const serverCache: Partial<Record<ServerEnvName, string | undefined>> = {};

/** Lazily read ONE server secret. Call inside a request handler only —
 *  never at module top level (static prerender would bake it in). */
export function serverEnv(name: ServerEnvName): string | undefined {
  if (!(name in serverCache)) serverCache[name] = process.env[SERVER_VARS[name]];
  return serverCache[name];
}

/** Clean 503 CONFIG_MISSING response — never serialize secret VALUES. */
export function configMissingResponse(code: ServerEnvName = "apiFootballKey") {
  return Response.json(
    { error: { code: "CONFIG_MISSING", missing: SERVER_VARS[code] } },
    { status: 503 }
  );
}
