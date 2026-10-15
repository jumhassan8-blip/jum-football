"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthScaffold from "@/components/auth/AuthScaffold";
import PasswordField from "@/components/auth/PasswordField";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { loginEmail, resetPassword } from "@/lib/firebase";
import { useToast } from "@/lib/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const t = useT();
  const toast = useToast();
  const { refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t("auth.errEmailFormat");
    if (!password) next.password = t("auth.errRequired");
    setErrors(next);
    if (next.email || next.password) return;

    setBusy(true);
    try {
      await loginEmail(email.trim(), password);
      refresh();
      router.push("/profile/");
    } catch {
      setErrors({ form: t("auth.errLogin") });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: t("auth.errEmailFormat") });
      return;
    }
    try {
      await resetPassword(email.trim());
      toast(t("auth.resetSent", { email: email.trim() }));
    } catch {
      setErrors({ form: t("auth.errGeneric") });
    }
  };

  return (
    <AuthScaffold title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div>
          <label htmlFor="login-email" className="mb-1 block text-[12px] font-bold text-dim">
            {t("auth.email")}
          </label>
          <input
            id="login-email"
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
          id="login-password"
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void forgot()}
            className="text-[12px] font-bold text-accent active:opacity-70"
          >
            {t("auth.forgotPassword")}
          </button>
        </div>

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
          {t("auth.signIn")}
        </button>

        <p className="pt-2 text-center text-[12px] text-dim">
          {t("auth.noAccount")}{" "}
          <Link href="/profile/signup/" className="font-bold text-accent">
            {t("auth.signUp")}
          </Link>
        </p>
      </form>
    </AuthScaffold>
  );
}
