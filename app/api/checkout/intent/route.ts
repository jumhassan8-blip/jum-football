// ─────────────────────────────────────────────────────────────
// JUM Football · /api/checkout/intent — PRO payment intent.
// Creates a Stripe Subscription (STRIPE_FOOTBALL_PRICE_ID) with an
// incomplete first invoice, returns the PaymentIntent clientSecret.
// Fail-closed: a missing server secret → 503 { code: CONFIG_MISSING },
// never undefined-as-string, never a silent demo handshake.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { ConfigMissingError, getProPriceId, getStripeServer } from "@/lib/stripe-server";
import { configMissingResponse } from "@/lib/env";

export async function POST(req: Request) {
  let uid = "";
  try {
    const body = (await req.json().catch(() => ({}))) as { uid?: string };
    uid = String(body.uid ?? "anonymous").slice(0, 64);
  } catch {
    uid = "anonymous";
  }

  let stripe;
  let price: string;
  try {
    stripe = getStripeServer();
    price = getProPriceId();
  } catch (e) {
    if (e instanceof ConfigMissingError) return configMissingResponse(e.missing);
    throw e;
  }

  try {
    const customer = await stripe.customers.create({
      metadata: { uid, plan: "jum-pro" },
    });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { uid },
    });
    const invoice = subscription.latest_invoice as {
      payment_intent?: { client_secret?: string | null } | string | null;
    } | null;
    const clientSecret =
      invoice && typeof invoice === "object" && invoice.payment_intent && typeof invoice.payment_intent === "object"
        ? invoice.payment_intent.client_secret
        : null;

    if (!clientSecret) {
      return NextResponse.json(
        { error: { code: "STRIPE_INTENT_FAILED" } },
        { status: 502 }
      );
    }
    return NextResponse.json({ clientSecret, subscriptionId: subscription.id, customerId: customer.id });
  } catch {
    return NextResponse.json({ error: { code: "STRIPE_UNAVAILABLE" } }, { status: 502 });
  }
}
