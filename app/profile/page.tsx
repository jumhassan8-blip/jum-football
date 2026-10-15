"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Globe,
  LogOut,
  Mail,
  User,
  X,
} from "lucide-react";
import { LOCALES, useI18n, type LocaleCode } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { signOutJum } from "@/lib/firebase";
import { useFollowedTeams } from "@/lib/follows";
import { usePro } from "@/lib/usePro";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import NotifSettingsSheet from "@/components/NotifSettingsSheet";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const { user, ready } = useAuth();
  const { ids } = useFollowedTeams();
  const { isPro } = usePro();
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [softPromptDismissed, setSoftPromptDismissed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    setCoins(readJSON("jumCoins", 250));
  }, []);

  const guest = !user || user.isAnonymous;
  const hasLocalProgress = coins > 0 || ids.length > 0;
  const showSoftPrompt = guest && ready && hasLocalProgress && !softPromptDismissed;

  const initial = guest ? "?" : (user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen pb-24">
      <Header />

      <main className="mx-auto max-w-lg px-4 pt-4 lg:max-w-3xl">
        <h1 className="py-2 text-center text-[16px] font-extrabold">{t("profile.title")}</h1>

        {showSoftPrompt && (
          <div className="mb-4 rounded-card bg-accent/10 p-3.5 ring-1 ring-accent/40">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-extrabold">{t("auth.softPromptTitle")}</p>
                <p className="mt-0.5 text-[11px] text-dim">{t("auth.softPromptBody")}</p>
              </div>
              <button
                onClick={() => setSoftPromptDismissed(true)}
                aria-label={t("common.close")}
                className="text-dim active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-2.5 flex gap-2">
              <Link
                href="/profile/signup/"
                className="flex-1 rounded-full bg-accent py-2 text-center text-[12px] font-bold text-bg active:scale-[0.98]"
              >
                {t("auth.softPromptCta")}
              </Link>
              <button
                onClick={() => setSoftPromptDismissed(true)}
                className="flex-1 rounded-full bg-card py-2 text-[12px] font-bold ring-1 ring-divider active:scale-[0.98]"
              >
                {t("auth.softPromptLater")}
              </button>
            </div>
          </div>
        )}

        {/* account */}
        <section className="rounded-card bg-card p-4 ring-1 ring-divider">
          <h2 className="mb-3 text-[13px] font-bold">{t("profile.account")}</h2>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-[18px] font-black text-accent ring-1 ring-accent/30">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              {guest ? (
                <>
                  <p className="flex items-center gap-1 text-[14px] font-extrabold">
                    <User size={14} className="text-dim" />
                    {t("profile.guest")}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-dim">{t("profile.guestHint")}</p>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-1 truncate text-[14px] font-extrabold">
                    <Mail size={14} className="shrink-0 text-dim" />
                    <span className="truncate">{user.email}</span>
                  </p>
                  <p
                    className={`mt-0.5 flex items-center gap-1 text-[11px] font-bold ${
                      user.emailVerified ? "text-accent" : "text-[#FFB020]"
                    }`}
                  >
                    <BadgeCheck size={12} />
                    {user.emailVerified
                      ? t("profile.emailVerified")
                      : t("profile.emailNotVerified")}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5 ring-1 ring-divider">
            <Coins size={15} className="text-[#FFD34D]" />
            <span className="text-[12px] font-bold">{t("profile.coins")}</span>
            <span className="ml-auto text-[14px] font-black text-[#FFD34D]">
              {coins.toLocaleString()}
            </span>
          </div>

          {isPro && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2.5 ring-1 ring-accent/40">
              <Crown size={15} className="text-accent" />
              <span className="text-[12px] font-bold">{t("profile.proMember")}</span>
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-black text-bg">
                PRO
              </span>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            {guest ? (
              <>
                <Link
                  href="/profile/login/"
                  className="flex-1 rounded-full bg-card py-2.5 text-center text-[13px] font-bold ring-1 ring-divider active:scale-[0.98]"
                >
                  {t("profile.signIn")}
                </Link>
                <Link
                  href="/profile/signup/"
                  className="flex-1 rounded-full bg-accent py-2.5 text-center text-[13px] font-bold text-bg active:scale-[0.98]"
                >
                  {t("profile.createAccount")}
                </Link>
              </>
            ) : (
              <button
                onClick={() => {
                  signOutJum().finally(() => router.push("/profile/"));
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card py-2.5 text-[13px] font-bold text-[#FF6B6B] ring-1 ring-divider active:scale-[0.98]"
              >
                <LogOut size={14} />
                {t("profile.signOut")}
              </button>
            )}
          </div>
        </section>

        {/* notifications */}
        <section className="mt-4 rounded-card bg-card ring-1 ring-divider">
          <button
            onClick={() => setNotifOpen(true)}
            className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left active:bg-white/5"
          >
            <Bell size={15} className="text-accent" />
            <span className="flex-1 text-[13px] font-bold">{t("notif.title")}</span>
            <span className="text-[10px] font-bold text-dim">
              {ids.length > 0 ? t("notif.followingCount", { count: ids.length }) : t("notif.noTeams")}
            </span>
            <ChevronRight size={15} className="text-dim" />
          </button>
        </section>

        {/* language */}
        <section className="mt-4 rounded-card bg-card ring-1 ring-divider">
          <h2 className="flex items-center gap-1.5 px-4 pb-1 pt-3.5 text-[13px] font-bold">
            <Globe size={14} className="text-accent" />
            {t("profile.language")}
          </h2>
          <div className="grid grid-cols-2 gap-1 p-2">
            {LOCALES.map((l) => {
              const active = l.code === locale;
              return (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code as LocaleCode)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12px] font-bold transition-transform active:scale-[0.98] ${
                    active ? "bg-accent/15 text-accent ring-1 ring-accent/40" : "text-foreground"
                  }`}
                >
                  <span className="flex-1 truncate">{l.native}</span>
                  {active && <Check size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <NotifSettingsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
      <BottomNav />
    </div>
  );
}
