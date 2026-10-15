"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function AuthScaffold({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col px-5 pb-10 pt-4">
      <Link
        href="/profile/"
        aria-label={t("a11y.backToMatches")}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-card ring-1 ring-divider active:scale-90"
      >
        <ArrowLeft size={17} />
      </Link>
      <div className="mt-8">
        <h1 className="text-[22px] font-black">{title}</h1>
        <p className="mt-1 text-[13px] text-dim">{subtitle}</p>
      </div>
      <div className="mt-7 flex-1">{children}</div>
    </div>
  );
}
