"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isDemoMode } from "@/lib/firebase";
import { usePro } from "@/lib/usePro";

/**
 * /pro/success — demo mode (?demo=1 or no Stripe): flips isPro locally,
 * clearly labeled. Key mode: the Stripe webhook writes
 * users/{uid}/pro.active — we poll Firestore until it lands (spinner),
 * then cache the entitlement locally so every screen lights up at once.
 */
export default function ProSuccessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPro, setPro } = usePro();
  const [demo, setDemo] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    confetti({
      particleCount: 140,
      spread: 75,
      origin: { y: 0.3 },
      colors: ["#B4FF39", "#FFFFFF", "#FFD34D"],
    });

    if (new URLSearchParams(window.location.search).has("demo")) {
      setDemo(true);
      setPro(); // local entitlement — clearly labeled demo below
      return;
    }
    if (isDemoMode() || !user?.uid) {
      // no Firebase either — nothing to poll, grant locally
      setDemo(true);
      setPro();
      return;
    }
    // key mode: poll users/{uid}/pro.active (webhook-driven)
    setWaiting(true);
    let stop = false;
    let unsub: (() => void) | undefined;
    const timeout = setTimeout(() => {
      if (!stop) {
        setTimedOut(true);
        setWaiting(false);
      }
    }, 30_000);
    void (async () => {
      try {
        const { getFirestoreDb } = await import("@/lib/firebase");
        const db = await getFirestoreDb();
        if (!db || stop) throw new Error("no db");
        const { doc, onSnapshot } = await import("firebase/firestore");
        unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.data()?.pro?.active === true) {
            stop = true;
            clearTimeout(timeout);
            setWaiting(false);
            setPro();
          }
        });
      } catch {
        if (!stop) {
          stop = true;
          clearTimeout(timeout);
          setTimedOut(true);
          setWaiting(false);
        }
      }
    })();
    return () => {
      stop = true;
      clearTimeout(timeout);
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070709] px-6 text-center text-white">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#B4FF39]/15 ring-2 ring-[#B4FF39]">
        <Crown size={38} className="text-[#B4FF39]" />
      </span>
      <h1 className="mt-5 text-[24px] font-black">Welcome to JUM PRO 🎉</h1>

      {waiting ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] font-bold text-[#888888]">
          <Loader2 size={15} className="animate-spin text-[#B4FF39]" />
          Confirming your subscription…
        </p>
      ) : timedOut && !isPro ? (
        <p className="mt-3 max-w-xs text-[13px] font-semibold text-[#FFB020]">
          Still confirming with the app store — pull down on any screen in a moment, or
          check Profile. Your PRO badge appears automatically.
        </p>
      ) : (
        <>
          {demo && (
            <span className="mt-3 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#888888] ring-1 ring-white/15">
              Demo purchase — nothing was charged
            </span>
          )}
          <p className="mt-3 max-w-xs text-[13px] font-semibold text-[#CCCCCC]">
            Zero ads. Every league. Goal alerts on. Enjoy the match.
          </p>
        </>
      )}

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <button
          onClick={() => router.push("/live/")}
          className="min-h-[50px] w-full rounded-full bg-[#B4FF39] text-[15px] font-black text-black active:scale-[0.99]"
        >
          Start watching
        </button>
        <Link
          href="/profile/"
          className="min-h-[46px] w-full rounded-full border border-[#222228] bg-[#15151A] text-center text-[13px] font-bold leading-[46px] text-[#AAAAAA]"
        >
          Back to Profile
        </Link>
      </div>
    </div>
  );
}
