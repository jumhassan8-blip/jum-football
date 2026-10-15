"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown, Loader2, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { publicEnv } from "@/lib/env";
import { detectWalletPref } from "@/lib/checkout";
import DemoCheckout from "@/components/DemoCheckout";
import StripeCheckout from "@/components/StripeCheckout";

type Intent =
  | { status: "loading" }
  | { status: "demo" }
  | { status: "live"; clientSecret: string };

const PERKS = [
  { icon: Zap, text: "Zero ads — no breaks, ever" },
  { icon: Crown, text: "All leagues, every match" },
  { icon: ShieldCheck, text: "Goal alerts for your teams" },
  { icon: ArrowLeft, text: "Cancel anytime" },
];

export default function ProCheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [intent, setIntent] = useState<Intent>({ status: "loading" });
  const walletPref = detectWalletPref();
  const publishableKey = publicEnv.stripePublishableKey;

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/checkout/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: user?.uid ?? "" }),
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((j: { demo?: boolean; clientSecret?: string }) => {
        if (j.demo || !j.clientSecret || !publishableKey) setIntent({ status: "demo" });
        else setIntent({ status: "live", clientSecret: j.clientSecret });
      })
      .catch(() => {
        if (!ac.signal.aborted) setIntent({ status: "demo" });
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-[#070709] pb-10 text-white">
      <header className="sticky top-0 z-40 border-b border-[#222228] bg-[#070709]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-4">
          <button
            onClick={() => router.push("/profile/")}
            aria-label="Back to Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#AAAAAA] hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={19} />
          </button>
          <p className="flex items-center gap-1.5 text-[14px] font-extrabold">
            <Crown size={15} className="text-[#B4FF39]" />
            JUM PRO
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] space-y-4 px-4 pt-4">
        {/* order summary */}
        <section className="rounded-2xl border border-[#222228] bg-[#15151A] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-black">JUM PRO</p>
              <p className="text-[11px] font-bold text-[#888888]">Monthly subscription</p>
            </div>
            <p className="text-right">
              <span className="text-[20px] font-black text-[#B4FF39]">$5</span>
              <span className="text-[11px] font-bold text-[#888888]">/month</span>
            </p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-[12px] font-semibold text-[#CCCCCC]">
                <Icon size={13} className="shrink-0 text-[#B4FF39]" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* payment methods */}
        <section className="rounded-2xl border border-[#222228] bg-[#15151A] p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#888888]">
            Payment method
          </p>
          {intent.status === "loading" ? (
            <div className="flex min-h-[120px] items-center justify-center text-[#888888]">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : intent.status === "live" ? (
            <StripeCheckout
              publishableKey={publishableKey}
              clientSecret={intent.clientSecret}
              walletPref={walletPref}
              fallback={<DemoCheckout walletPref={walletPref} />}
            />
          ) : (
            <DemoCheckout walletPref={walletPref} />
          )}
        </section>

        <p className="px-2 text-center text-[10px] font-semibold leading-relaxed text-[#888888]">
          By paying you agree to the JUM PRO terms. You can cancel anytime in Profile.
        </p>
        <Link
          href="/profile/"
          className="block text-center text-[12px] font-bold text-[#B4FF39]"
        >
          ← Back to Profile
        </Link>
      </main>
    </div>
  );
}
