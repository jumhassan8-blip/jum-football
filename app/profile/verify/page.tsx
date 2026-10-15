"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import AuthScaffold from "@/components/auth/AuthScaffold";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { isDemoMode, markVerifiedDemo, sendVerification } from "@/lib/firebase";
import { fireConfetti, useToast } from "@/lib/store";

const RESEND_COOLDOWN = 60; // seconds between resends
const RESEND_MAX_PER_HOUR = 3;
const RESEND_LOG_KEY = "jum-verify-resends";

function readResends(): number[] {
  try {
    return JSON.parse(window.localStorage.getItem(RESEND_LOG_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

export default function VerifyPage() {
  const t = useT();
  const toast = useToast();
  const { user, ready, refresh } = useAuth();
  const router = useRouter();
  const [cooldown, setCooldown] = useState(0);
  const [maxed, setMaxed] = useState(false);
  const [busy, setBusy] = useState(false);
  const celebrated = useRef(false);

  const email = user?.email ?? "";
  const demo = isDemoMode();

  // verified → confetti + welcome toast once, then back to profile
  useEffect(() => {
    if (!ready || !user || user.isAnonymous || !user.emailVerified) return;
    if (celebrated.current) {
      router.push("/profile/");
      return;
    }
    celebrated.current = true;
    fireConfetti();
    toast(t("verify.verifiedToast"));
    const tm = setTimeout(() => router.push("/profile/"), 1600);
    return () => clearTimeout(tm);
  }, [ready, user, router, toast, t]);

  // 60s resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const tm = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(tm);
  }, [cooldown]);

  useEffect(() => {
    const hourAgo = Date.now() - 3600_000;
    setMaxed(readResends().filter((ts) => ts > hourAgo).length >= RESEND_MAX_PER_HOUR);
  }, []);

  const resend = async () => {
    if (cooldown > 0 || maxed || busy) return;
    setBusy(true);
    try {
      await sendVerification(user);
      const hourAgo = Date.now() - 3600_000;
      const log = [...readResends().filter((ts) => ts > hourAgo), Date.now()];
      window.localStorage.setItem(RESEND_LOG_KEY, JSON.stringify(log));
      setCooldown(RESEND_COOLDOWN);
      if (log.length >= RESEND_MAX_PER_HOUR) setMaxed(true);
    } catch {
      toast(t("auth.errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScaffold title={t("verify.title")} subtitle={t("verify.body", { email })}>
      <div className="flex flex-col items-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/40">
          <MailCheck size={34} className="text-accent" />
        </span>

        <div className="mt-8 w-full space-y-3">
          <button
            onClick={() => void resend()}
            disabled={cooldown > 0 || maxed || busy}
            className="w-full rounded-full bg-accent py-3 text-[14px] font-black text-bg transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {maxed
              ? t("verify.resendMax")
              : cooldown > 0
                ? t("verify.resendIn", { sec: cooldown })
                : t("verify.resend")}
          </button>

          <button
            onClick={() => refresh()}
            className="w-full rounded-full bg-card py-3 text-[14px] font-bold ring-1 ring-divider transition-transform active:scale-[0.98]"
          >
            {t("verify.check")}
          </button>

          {demo && (
            <button
              onClick={() => {
                void markVerifiedDemo().then(() => refresh());
              }}
              className="w-full rounded-full bg-card py-3 text-[14px] font-bold text-dim ring-1 ring-divider transition-transform active:scale-[0.98]"
            >
              {t("verify.simulateDemo")}
            </button>
          )}

          <Link
            href="/profile/"
            className="block w-full py-3 text-center text-[13px] font-bold text-dim active:opacity-70"
          >
            {t("verify.later")}
          </Link>
        </div>
      </div>
    </AuthScaffold>
  );
}
