"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Play, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { usePro } from "@/lib/usePro";

/**
 * Match-unlock gate: wraps any "Watch Live" entry point.
 * PRO user → onWatch() immediately. Free user → dismissible unlock sheet:
 *   [Watch with ads]  free, an interstitial every 20:00 of viewing
 *   [Go PRO]          → /pro/checkout (Stripe when keys exist, demo flow until then)
 */
export default function WatchGate({
  onWatch,
  home,
  away,
  children,
  className,
}: {
  onWatch: () => void;
  home: string;
  away: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useT();
  const router = useRouter();
  const { isPro } = usePro();
  const [open, setOpen] = useState(false);

  const requestWatch = () => {
    if (isPro) {
      onWatch();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <span onClick={requestWatch} className={className} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); requestWatch(); } }}>
        {children}
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-t-3xl border-t border-divider bg-card p-5 pb-8"
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-[16px] font-black">{t("watch.unlockTitle")}</h2>
                <button onClick={() => setOpen(false)} aria-label={t("common.close")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="mb-4 text-[12px] font-bold text-dim">
                {home} vs {away}
              </p>
              <button
                onClick={() => { setOpen(false); onWatch(); }}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[14px] font-black text-bg transition active:scale-[0.99]"
              >
                <Play size={16} fill="currentColor" />
                {t("watch.watchWithAds")}
              </button>
              <p className="mt-1.5 text-center text-[10px] text-dim/70">{t("watch.watchWithAdsHint")}</p>
              <div className="my-4 flex items-center gap-3 text-[10px] font-bold text-dim/60">
                <span className="h-px flex-1 bg-divider" />
                {t("common.or")}
                <span className="h-px flex-1 bg-divider" />
              </div>
              <button
                onClick={() => { setOpen(false); router.push("/pro/checkout/"); }}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-[14px] font-black text-black transition active:scale-[0.99]"
              >
                <Crown size={16} />
                {t("watch.goPro")}
              </button>
              <p className="mt-1.5 text-center text-[10px] text-dim/70">{t("watch.proHint")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
