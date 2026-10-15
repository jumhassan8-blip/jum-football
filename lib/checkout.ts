"use client";

// ── Checkout helpers: demo card validation + wallet detection ──
// Pure functions — no Stripe dependency, unit-testable, and exactly
// the UX the real Payment Element provides (Luhn, brand, inline errors).

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "diners" | "jcb" | "unionpay" | "unknown";

export function detectBrand(num: string): CardBrand {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^6(?:011|5)/.test(d)) return "discover";
  if (/^3(?:0[0-5]|[68])/.test(d)) return "diners";
  if (/^35/.test(d)) return "jcb";
  if (/^62/.test(d)) return "unionpay";
  return "unknown";
}

export function luhnValid(num: string): boolean {
  const d = num.replace(/\D/g, "");
  if (d.length < 13) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(num: string, brand: CardBrand): string {
  const d = num.replace(/\D/g, "").slice(0, brand === "amex" ? 15 : 16);
  if (brand === "amex") {
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(" ");
  }
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function expiryValid(v: string): boolean {
  const m = v.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mo = Number(m[1]);
  if (mo < 1 || mo > 12) return false;
  const yy = 2000 + Number(m[2]);
  const now = new Date();
  const end = new Date(yy, mo, 0, 23, 59, 59); // last day of expiry month
  return end.getTime() >= now.getTime();
}

export function cvcValid(v: string, brand: CardBrand): boolean {
  const len = brand === "amex" ? 4 : 3;
  return new RegExp(`^\\d{${len}}$`).test(v);
}

export type CardField = "number" | "expiry" | "cvc" | "zip";

export function validateCard(fields: Record<CardField, string>): Partial<Record<CardField, string>> {
  const brand = detectBrand(fields.number);
  const errs: Partial<Record<CardField, string>> = {};
  if (!fields.number.trim()) errs.number = "Card number is required";
  else if (!luhnValid(fields.number)) errs.number = "That card number looks off — check the digits";
  if (!fields.expiry.trim()) errs.expiry = "Expiry required";
  else if (!expiryValid(fields.expiry)) errs.expiry = "Expiry must be MM/YY in the future";
  if (!fields.cvc.trim()) errs.cvc = "CVC required";
  else if (!cvcValid(fields.cvc, brand)) errs.cvc = brand === "amex" ? "4-digit CVC" : "3-digit CVC";
  return errs;
}

/** "4242 4242…" → last4 + brand label for the demo receipt. */
export function cardSummary(num: string): { last4: string; brand: CardBrand } {
  const d = num.replace(/\D/g, "");
  return { last4: d.slice(-4), brand: detectBrand(d) };
}

// ── Wallet preference by browser (order on the checkout page) ──

export type WalletPref = "applePay" | "googlePay" | null;

/**
 * Safari (iOS/Mac) → Apple Pay first; Chrome/Edge/Android → Google Pay
 * first; everything else card-only. Best-effort on desktop Chrome:
 * Google Pay still renders (Stripe's button hides itself via
 * canMakePayment when no wallet exists — never a broken mount).
 */
export function detectWalletPref(): WalletPref {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android|OPR|Vivaldi/.test(ua);
  if (isSafari) return "applePay";
  if (/Chrome|Chromium|Edg|OPR|Vivaldi/.test(ua) || /Android/.test(ua)) return "googlePay";
  return null;
}

/** Launch-notify toggle (demo wallet sheets) — stored locally. */
export const LAUNCH_NOTIFY_KEY = "jum-launch-notify";

export function readLaunchNotify(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LAUNCH_NOTIFY_KEY) === "1";
}

export function writeLaunchNotify(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAUNCH_NOTIFY_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event("jum-store-change"));
}
