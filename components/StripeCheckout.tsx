"use client";

import { Component, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Loader2, Lock } from "lucide-react";
import type { WalletPref } from "@/lib/checkout";

/* Renders the real Stripe flow once keys exist: ExpressCheckoutElement
 * (Apple Pay / Google Pay) first with the browser's wallet prioritized,
 * then the Payment Element card form. Any load/mount failure falls back
 * to the demo flow — never a broken Stripe mount. */

class StripeErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("[checkout] Stripe mount failed — demo fallback:", String(e).slice(0, 100));
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function StripeCheckout({
  publishableKey, clientSecret, walletPref, fallback,
}: {
  publishableKey: string;
  clientSecret: string;
  walletPref: WalletPref;
  fallback: ReactNode;
}) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [failed, setFailed] = useState(false);

  // loadStripe manages its own script singleton — safe under StrictMode
  if (!failed && !stripe) {
    loadStripe(publishableKey)
      .then((s) => (s ? setStripe(s) : setFailed(true)))
      .catch(() => setFailed(true));
  }

  if (failed) return <>{fallback}</>;
  if (!stripe) {
    return (
      <div className="flex min-h-[120px] items-center justify-center text-[#888888]">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  return (
    <StripeErrorBoundary fallback={fallback}>
      <Elements
        stripe={stripe}
        options={{
          clientSecret,
          appearance: {
            theme: "night",
            variables: { colorPrimary: "#B4FF39", colorBackground: "#15151A", colorText: "#FFFFFF" },
          },
        }}
      >
        <StripeInner walletPref={walletPref} />
      </Elements>
    </StripeErrorBoundary>
  );
}

function StripeInner({ walletPref }: { walletPref: WalletPref }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const walletOptions =
    walletPref === "applePay"
      ? { applePay: "always" as const, googlePay: "auto" as const }
      : walletPref === "googlePay"
        ? { applePay: "auto" as const, googlePay: "always" as const }
        : { applePay: "never" as const, googlePay: "never" as const };
  const showWallets = walletPref !== null;

  const confirm = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setMsg("");
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/pro/success/` },
    });
    setBusy(false);
    if (error) setMsg(error.message ?? "Payment failed — try again");
    else router.push("/pro/success/");
  };

  return (
    <div className="space-y-4">
      {showWallets && (
        <>
          <ExpressCheckoutElement
            options={{ paymentMethods: walletOptions, buttonType: { applePay: "subscribe", googlePay: "subscribe" } }}
            onConfirm={() => void confirm()}
          />
          <div className="flex items-center gap-3 text-[10px] font-bold text-[#888888]">
            <span className="h-px flex-1 bg-[#2A2A32]" />
            Or pay with card
            <span className="h-px flex-1 bg-[#2A2A32]" />
          </div>
        </>
      )}
      <PaymentElement options={{ layout: "tabs" }} />
      {msg && <p className="text-[12px] font-bold text-[#FF6B6B]">{msg}</p>}
      <button
        onClick={() => void confirm()}
        disabled={!stripe || busy}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#B4FF39] text-[15px] font-black text-black transition active:scale-[0.99] disabled:opacity-70"
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Lock size={15} />}
        {busy ? "Processing…" : "Pay $5.00"}
      </button>
    </div>
  );
}
