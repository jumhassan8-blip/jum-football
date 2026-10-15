"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
}) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-bold text-dim">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-xl bg-bg px-3.5 ring-1 transition-colors ${
          error ? "ring-[#FF4D4D]" : "ring-divider focus-within:ring-accent"
        }`}
      >
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-h-[44px] w-full bg-transparent text-[13px] outline-none placeholder:text-dim/60"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={visible}
          className="shrink-0 text-dim transition-transform active:scale-90"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] font-bold text-[#FF4D4D]">{error}</p>}
    </div>
  );
}
