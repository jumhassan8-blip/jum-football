"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useFollowedTeams } from "@/lib/follows";
import { getPushState, requestPushAndStoreToken, type PushState } from "@/lib/messaging";

/**
 * FOLLOW-tab fallback banner for goal alerts.
 * Shows only once the user follows at least one team and push isn't
 * granted: "Enable goal alerts 🔔" while permission is askable, or a
 * how-to-re-enable sheet once the browser denied it. Hidden entirely
 * when push is unsupported (fail-closed, app fully usable).
 */
export default function PushBanner() {
  const t = useT();
  const { ids, uid } = useFollowedTeams();
  const [state, setState] = useState<PushState>("default");
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setState(getPushState());
    const sync = () => setState(getPushState());
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  if (state === "unsupported" || state === "granted" || ids.length === 0 || dismissed) return null;

  return (
    <>
      <div className="mt-3 flex items-center gap-2.5 rounded-card bg-accent/10 p-3 ring-1 ring-accent/30">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Bell size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold">{t("push.bannerTitle")}</p>
          <p className="text-[10px] font-semibold text-dim">{t("push.bannerBody")}</p>
        </div>
        {state === "denied" ? (
          <button
            onClick={() => setShowHelp(true)}
            className="shrink-0 rounded-full bg-card px-3 py-1.5 text-[11px] font-bold ring-1 ring-divider active:scale-[0.97]"
          >
            {t("push.howToEnable")}
          </button>
        ) : (
          <button
            onClick={() => {
              void requestPushAndStoreToken(uid).then(setState);
            }}
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[11px] font-black text-bg active:scale-[0.97]"
          >
            {t("push.enable")}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("common.close")}
          className="shrink-0 text-dim active:scale-90"
        >
          <X size={14} />
        </button>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 pb-10"
          onClick={() => setShowHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[#222228] bg-[#15151A] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[14px] font-extrabold">
                <BellOff size={15} className="text-[#FFB020]" />
                {t("push.deniedTitle")}
              </p>
              <button onClick={() => setShowHelp(false)} aria-label={t("common.close")} className="text-dim">
                <X size={16} />
              </button>
            </div>
            <ol className="list-decimal space-y-2 pl-4 text-[12px] font-semibold text-[#CCCCCC]">
              <li>{t("push.deniedStep1")}</li>
              <li>{t("push.deniedStep2")}</li>
              <li>{t("push.deniedStep3")}</li>
            </ol>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full rounded-full bg-accent py-2.5 text-[13px] font-black text-bg active:scale-[0.98]"
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
