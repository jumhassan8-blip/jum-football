"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, CreditCard, Loader2, Lock, X } from "lucide-react";
import {
  detectBrand, formatCardNumber, formatExpiry,
  readLaunchNotify, validateCard, writeLaunchNotify,
  type CardField, type WalletPref,
} from "@/lib/checkout";

/** Apple logo (white) for the black Apple Pay button. */
const AppleMark = () => (
  <svg viewBox="0 0 384 512" className="h-4 w-4 fill-white" aria-hidden="true">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

/** G logo (white) for the black Google Pay button. */
const GMark = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.2 44 24c0-1.3-.1-2.7-.4-3.9z" />
  </svg>
);

export function WalletButton({ wallet, onClick }: { wallet: Exclude<WalletPref, null>; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={wallet === "applePay" ? "Pay with Apple Pay" : "Pay with Google Pay"}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-black text-[16px] font-semibold text-white ring-1 ring-white/20 transition active:scale-[0.99]"
    >
      {wallet === "applePay" ? (
        <>
          <AppleMark />
          <span>Pay</span>
        </>
      ) : (
        <>
          <GMark />
          <span>Pay</span>
        </>
      )}
    </button>
  );
}

/** Demo-mode payment methods: every button tappable; wallets open the
 *  launch-list sheet; the card runs full validation then a simulated pay. */
export default function DemoCheckout({ walletPref }: { walletPref: WalletPref }) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notify, setNotify] = useState(readLaunchNotify());
  const [fields, setFields] = useState<Record<CardField, string>>({ number: "", expiry: "", cvc: "", zip: "" });
  const [errs, setErrs] = useState<Partial<Record<CardField, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<CardField, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const brand = detectBrand(fields.number);

  const set = (k: CardField, v: string) => {
    const next = { ...fields, [k]: v };
    setFields(next);
    if (touched[k]) setErrs(validateCard(next));
  };
  const blur = (k: CardField) => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrs(validateCard(fields));
  };

  const pay = () => {
    const e = validateCard(fields);
    setTouched({ number: true, expiry: true, cvc: true, zip: true });
    setErrs(e);
    if (Object.keys(e).length > 0) return;
    setBusy(true);
    // demo charge — 1.2s, then the success screen flips isPro
    setTimeout(() => {
      setBusy(false);
      router.push("/pro/success/?demo=1");
    }, 1200);
  };

  const inputCls = (k: CardField) =>
    `min-h-[48px] w-full rounded-xl border bg-black/40 px-3.5 text-[14px] font-semibold text-white outline-none transition placeholder:text-[#55555F] ${
      errs[k] && touched[k] ? "border-[#FF6B6B]" : "border-[#2A2A32] focus:border-[#B4FF39]"
    }`;

  return (
    <>
      {walletPref && (
        <>
          <WalletButton wallet={walletPref} onClick={() => setSheetOpen(true)} />
          <WalletSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            notify={notify}
            onNotify={(v) => {
              setNotify(v);
              writeLaunchNotify(v);
            }}
          />
          <div className="my-4 flex items-center gap-3 text-[10px] font-bold text-[#888888]">
            <span className="h-px flex-1 bg-[#2A2A32]" />
            Or pay with card
            <span className="h-px flex-1 bg-[#2A2A32]" />
          </div>
        </>
      )}

      {/* card form — Luhn + brand + inline validation, same UX as the
          Stripe Payment Element it swaps in for once keys land */}
      <div className="space-y-2.5">
        <div>
          <div className="relative">
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              aria-label="Card number"
              value={fields.number}
              onChange={(e) => set("number", formatCardNumber(e.target.value, brand))}
              onBlur={() => blur("number")}
              className={inputCls("number")}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-[#888888]">
              {brand === "unknown" ? <CreditCard size={18} className="text-[#55555F]" /> : brand}
            </span>
          </div>
          {errs.number && touched.number && <p className="mt-1 text-[11px] font-bold text-[#FF6B6B]">{errs.number}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              aria-label="Expiry"
              value={fields.expiry}
              onChange={(e) => set("expiry", formatExpiry(e.target.value))}
              onBlur={() => blur("expiry")}
              className={inputCls("expiry")}
            />
            {errs.expiry && touched.expiry && <p className="mt-1 text-[11px] font-bold text-[#FF6B6B]">{errs.expiry}</p>}
          </div>
          <div>
            <input
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="CVC"
              aria-label="CVC"
              value={fields.cvc}
              onChange={(e) => set("cvc", e.target.value.replace(/\D/g, "").slice(0, brand === "amex" ? 4 : 3))}
              onBlur={() => blur("cvc")}
              className={inputCls("cvc")}
            />
            {errs.cvc && touched.cvc && <p className="mt-1 text-[11px] font-bold text-[#FF6B6B]">{errs.cvc}</p>}
          </div>
        </div>
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="ZIP / postal code"
          aria-label="ZIP"
          value={fields.zip}
          onChange={(e) => set("zip", e.target.value.slice(0, 10))}
          className={inputCls("zip")}
        />
      </div>

      <button
        onClick={pay}
        disabled={busy}
        className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#B4FF39] text-[15px] font-black text-black transition active:scale-[0.99] disabled:opacity-70"
      >
        {busy ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Lock size={15} />
            Pay $5.00
          </>
        )}
      </button>
      <p className="mt-2 text-center text-[10px] font-semibold text-[#888888]">
        Demo mode — no real charge. Stripe activates at launch.
      </p>
    </>
  );
}

/** "You're on the list" sheet for demo wallet taps. */
export function WalletSheet({
  open, onClose, notify, onNotify,
}: {
  open: boolean;
  onClose: () => void;
  notify: boolean;
  onNotify: (v: boolean) => void;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 pb-10"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-[#222228] bg-[#15151A] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between">
          <p className="text-[15px] font-extrabold leading-snug">
            Payments activate when JUM PRO launches — you&apos;re on the list ✓
          </p>
          <button onClick={onClose} aria-label="Close" className="shrink-0 text-[#888888]">
            <X size={17} />
          </button>
        </div>
        <p className="text-[12px] font-semibold text-[#888888]">
          One tap will finish your subscription on launch day — no card needed twice.
        </p>
        <button
          onClick={() => onNotify(!notify)}
          className="mt-4 flex w-full items-center justify-between rounded-xl bg-black/40 px-3.5 py-3 ring-1 ring-[#2A2A32]"
        >
          <span className="text-[13px] font-bold">Notify me at launch</span>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
              notify ? "bg-[#B4FF39] text-black" : "bg-[#2A2A32] text-transparent"
            }`}
          >
            <Check size={14} strokeWidth={3.5} />
          </span>
        </button>
        <button
          onClick={onClose}
          className="mt-3 min-h-[46px] w-full rounded-full bg-[#B4FF39] text-[14px] font-black text-black active:scale-[0.99]"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
}
