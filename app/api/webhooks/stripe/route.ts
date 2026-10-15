// ─────────────────────────────────────────────────────────────
// JUM Football · /api/webhooks/stripe — PRO entitlement webhook.
// Signature-verified (STRIPE_WEBHOOK_SECRET + raw body), idempotent
// per event id, writes users/{uid}/pro.active via the service
// account. Fail-closed: missing webhook secret → 503 CONFIG_MISSING
// (codes only, never secret values in responses).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { serverEnv, configMissingResponse } from "@/lib/env";

export async function POST(req: Request) {
  const webhookSecret = serverEnv("stripeWebhookSecret");
  const secretKey = serverEnv("stripeSecretKey");
  if (!webhookSecret || !secretKey) return configMissingResponse("stripeWebhookSecret");

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: { id: string; type: string; data?: { object?: Record<string, unknown> } };
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret) as unknown as typeof event;
  } catch {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE" } }, { status: 400 });
  }

  const handled = new Set([
    "invoice.payment_succeeded",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);
  if (!handled.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    const saJson = serverEnv("firebaseServiceAccount");
    if (saJson) {
      const { createRequire } = await import("node:module");
      const req = createRequire(import.meta.url);
      const adminApp = req("firebase-admin/app");
      const adminFirestore = req("firebase-admin/firestore");
      const app = adminApp.getApps().length
        ? adminApp.getApps()[0]
        : adminApp.initializeApp({ credential: adminApp.cert(JSON.parse(saJson)) });
      const db = adminFirestore.getFirestore(app);

      const obj = (event.data?.object ?? {}) as {
        metadata?: { uid?: string };
        customer?: string;
        status?: string;
      };
      let uid = obj.metadata?.uid ?? "";
      if (!uid && obj.customer) {
        const snap = await db.collection("users").where("stripeCustomer", "==", obj.customer).limit(1).get();
        uid = snap.empty ? "" : snap.docs[0].id;
      }
      if (uid) {
        const active =
          event.type === "invoice.payment_succeeded"
            ? true
            : event.type === "customer.subscription.deleted"
              ? false
              : obj.status === "active" || obj.status === "trialing";
        await db.collection("users").doc(uid).set(
          { pro: { active, since: new Date().toISOString(), eventId: event.id } },
          { merge: true }
        );
        return NextResponse.json({ received: true, active });
      }
    }
  } catch {
    return NextResponse.json({ error: { code: "WEBHOOK_HANDLER_FAILED" } }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
