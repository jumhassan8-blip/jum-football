"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AdSlot from "@/components/AdSlot";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useAdConfig, applyAdConfig, type AdPos } from "@/lib/adConfig";

const POS_ORDER: AdPos[] = ["top", "infeed", "sidebar", "mobileSticky"];

export default function AdminPage() {
  const t = useT();
  const { user } = useAuth();
  const { config, loaded } = useAdConfig();

  const [clientId, setClientId] = useState("");
  const [slots, setSlots] = useState<Record<AdPos, string>>({
    top: "", infeed: "", sidebar: "", mobileSticky: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setClientId(config.clientId);
    setSlots({ ...config.slots });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    const next = {
      clientId: clientId.trim(),
      slots: {
        top: slots.top.trim(),
        infeed: slots.infeed.trim(),
        sidebar: slots.sidebar.trim(),
        mobileSticky: slots.mobileSticky.trim(),
      },
    };
    try {
      const { getFirestoreDb } = await import("@/lib/firebase");
      const db = await getFirestoreDb();
      if (db) {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "config", "adsense"), {
          clientId: next.clientId,
          adSlots: next.slots,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid ?? null,
        });
        setStatus(t("common.done"));
      } else {
        setStatus(t("common.cancel")); // demo mode — Firestore unavailable
      }
    } catch {
      setStatus(t("common.cancel"));
    } finally {
      applyAdConfig(next); // live hooks refresh regardless
      setSaving(false);
    }
  };

  const testRender = () => {
    setTesting(true);
    window.__jumAdTest = true;
    // force AdSlot instances to re-resolve config; blank values stay
    // blank → AdSlot renders the labeled placeholder (no fabricated IDs)
    applyAdConfig({
      clientId: clientId.trim(),
      slots: {
        top: slots.top.trim(),
        infeed: slots.infeed.trim(),
        sidebar: slots.sidebar.trim(),
        mobileSticky: slots.mobileSticky.trim(),
      },
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="mx-auto max-w-lg px-4 pt-4">
        <div className="flex items-center gap-2">
          <Link
            href="/profile/"
            aria-label={t("common.back")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:text-white"
          >
            <ArrowLeft size={19} />
          </Link>
          <h1 className="text-[17px] font-extrabold">Admin</h1>
        </div>

        {/* ── AdSense section ── */}
        <section className="mt-4 rounded-card bg-card p-4 ring-1 ring-divider">
          <h2 className="text-[14px] font-extrabold text-white">AdSense</h2>
          <p className="pt-1 text-[11px] text-dim">
            config/adsense · {user ? `signed in as ${user.uid.slice(0, 8)}…` : "guest"}
          </p>

          <label className="mt-4 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-dim">Client ID</span>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="ca-pub-1234567890123456"
              className="mt-1 w-full rounded-lg bg-bg px-3 py-2.5 text-[13px] text-white ring-1 ring-divider focus:outline-none focus:ring-accent"
            />
          </label>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {POS_ORDER.map((pos) => (
              <label key={pos} className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-dim">
                  {pos} slot ID
                </span>
                <input
                  value={slots[pos]}
                  onChange={(e) => setSlots((s) => ({ ...s, [pos]: e.target.value }))}
                  placeholder="1234567890"
                  className="mt-1 w-full rounded-lg bg-bg px-3 py-2.5 text-[13px] text-white ring-1 ring-divider focus:outline-none focus:ring-accent"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="min-h-[40px] flex-1 rounded-full bg-accent text-[12px] font-black text-bg transition-opacity disabled:opacity-50"
            >
              {saving ? t("common.loading") : t("common.save")}
            </button>
            <button
              onClick={testRender}
              className="min-h-[40px] flex-1 rounded-full bg-card text-[12px] font-black text-white ring-1 ring-divider transition-colors hover:ring-accent"
            >
              Test render
            </button>
          </div>
          {status && <p className="pt-2 text-[11px] font-bold text-dim">{status}</p>}
        </section>

        {/* live preview — Test render forces real-mode <ins> on this page */}
        {testing && (
          <section className="mt-4">
            <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-dim">
              Preview (test mode — real-mode markup, demo client)
            </p>
            <div className="rounded-card bg-card p-3 ring-1 ring-divider">
              <AdSlot pos="top" />
              <AdSlot pos="infeed" />
            </div>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
