"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";

export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <button
        aria-label={t("a11y.closeSheet")}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
      />
      <div className="sheet-up absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-2xl border-t border-divider bg-card p-4 pb-8 lg:max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold">{title}</h3>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-dim hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
