"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Check, ChevronRight, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useFollowedTeams, useNotifPrefs, useTeamNotifOverride, type NotifPrefs } from "@/lib/follows";

type ToggleKey = keyof NotifPrefs;

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-[#2A2A32]"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function PrefRows({
  prefs, onChange,
}: { prefs: NotifPrefs; onChange: (k: ToggleKey, v: boolean) => void }) {
  const t = useT();
  const rows: { k: ToggleKey; label: string; hint?: string }[] = [
    { k: "goals", label: t("notif.goals"), hint: t("notif.goalsHint") },
    { k: "allScoreChanges", label: t("notif.allScoreChanges") },
    { k: "kickoff", label: t("notif.kickoff") },
    { k: "fulltime", label: t("notif.fulltime") },
    { k: "news", label: t("notif.news"), hint: t("notif.newsHint") },
  ];
  return (
    <div className="divide-y divide-[#222228]">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold">{r.label}</p>
            {r.hint && <p className="text-[10px] font-semibold text-dim">{r.hint}</p>}
          </div>
          <Toggle on={prefs[r.k]} onClick={() => onChange(r.k, !prefs[r.k])} />
        </div>
      ))}
    </div>
  );
}

/** Profile → Notifications sheet: global toggles + per-team overrides (inherit global). */
export default function NotifSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { ids, uid } = useFollowedTeams();
  const { prefs, update } = useNotifPrefs(uid);
  const [team, setTeam] = useState<string | null>(null);
  const teamOverride = useTeamNotifOverride(uid, team);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        role="dialog"
        aria-modal="true"
        aria-label={t("notif.title")}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-[#222228] bg-[#15151A] p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {team === null ? (
          <>
            <div className="mb-1 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-extrabold">
                <Bell size={16} className="text-accent" />
                {t("notif.title")}
              </p>
              <button onClick={onClose} aria-label={t("common.close")} className="text-dim active:scale-90">
                <X size={18} />
              </button>
            </div>
            <p className="mb-2 text-[11px] font-semibold text-dim">{t("notif.globalHint")}</p>
            <PrefRows prefs={prefs} onChange={(k, v) => void update({ [k]: v })} />

            {ids.length > 0 && (
              <>
                <p className="mb-1 mt-4 text-[11px] font-black uppercase tracking-widest text-dim">
                  {t("notif.perTeam")}
                </p>
                <div className="divide-y divide-[#222228] rounded-2xl border border-[#222228]">
                  {ids.map((name) => (
                    <button
                      key={name}
                      onClick={() => setTeam(name)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-white/5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{name}</span>
                      <span className="text-[10px] font-bold text-dim">{t("notif.customize")}</span>
                      <ChevronRight size={14} className="text-dim" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between">
              <p className="truncate text-[15px] font-extrabold">{team}</p>
              <button onClick={() => setTeam(null)} aria-label={t("common.back")} className="text-dim active:scale-90">
                <X size={18} />
              </button>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-bold">{t("notif.inheritGlobal")}</p>
              <Toggle
                on={teamOverride.override === null}
                onClick={() => {
                  if (teamOverride.override === null) void teamOverride.save({ ...prefs });
                  else void teamOverride.save(null);
                }}
              />
            </div>
            {teamOverride.override === null ? (
              <p className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-[11px] font-bold text-dim">
                <Check size={13} className="text-accent" />
                {t("notif.inheriting")}
              </p>
            ) : (
              <PrefRows
                prefs={teamOverride.override}
                onChange={(k, v) => {
                  if (teamOverride.override) void teamOverride.save({ ...teamOverride.override, [k]: v });
                }}
              />
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
