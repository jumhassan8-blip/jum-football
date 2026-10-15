"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthScaffold from "@/components/auth/AuthScaffold";
import PasswordField from "@/components/auth/PasswordField";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { sendVerification, signupEmail } from "@/lib/firebase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const t = useT();
  const { refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t("auth.errEmailFormat");
    if (password.length < 8) next.password = t("auth.errPasswordShort");
    if (confirm !== password) next.confirm = t("auth.errPasswordMatch");
    setErrors(next);
    if (next.email || next.password || next.confirm) return;

    setBusy(true);
    try {
      const u = await signupEmail(email.trim(), password);
      refresh();
      try {
        await sendVerification(u);
      } catch {
        /* verification send failure is non-fatal — user can resend */
      }
      router.push("/profile/verify/");
    } catch {
      setErrors({ form: t("auth.errGeneric") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScaffold title={t("auth.createTitle")} subtitle={t("auth.createSubtitle")}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div>
          <label htmlFor="signup-email" className="mb-1 block text-[12px] font-bold text-dim">
            {t("auth.email")}
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            autoComplete="email"
            className={`min-h-[44px] w-full rounded-xl bg-bg px-3.5 text-[13px] outline-none ring-1 placeholder:text-dim/60 ${
              errors.email ? "ring-[#FF4D4D]" : "ring-divider focus:ring-accent"
            }`}
          />
          {errors.email && <p className="mt-1 text-[11px] font-bold text-[#FF4D4D]">{errors.email}</p>}
        </div>

        <PasswordField
          id="signup-password"
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="new-password"
        />

        <PasswordField
          id="signup-confirm"
          label={t("auth.confirmPassword")}
          placeholder={t("auth.confirmPlaceholder")}
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          autoComplete="new-password"
        />

        {errors.form && (
          <p className="rounded-xl bg-[#FF4D4D]/10 px-3 py-2.5 text-center text-[12px] font-bold text-[#FF4D4D]">
            {errors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent py-3 text-[14px] font-black text-bg transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {t("auth.signUp")}
        </button>

        <p className="pt-2 text-center text-[12px] text-dim">
          {t("auth.haveAccount")}{" "}
          <Link href="/profile/login/" className="font-bold text-accent">
            {t("auth.signIn")}
          </Link>
        </p>
      </form>
    </AuthScaffold>
  );
}
