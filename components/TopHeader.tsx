"use client";

import Link from "next/link";
import { CircleUserRound, FileText, Search } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function TopHeader() {
  const t = useT();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-green-header px-3">
      <Link
        href="/profile/"
        aria-label={t("profile.title")}
        className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:text-white"
      >
        <CircleUserRound size={24} />
      </Link>
      <h1 className="text-[17px] font-bold tracking-tight text-white">JUM Football</h1>
      <div className="flex items-center">
        <button
          aria-label={t("profile.title")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:text-white"
        >
          <FileText size={20} />
        </button>
        <button
          aria-label={t("common.search")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/85 transition-colors hover:text-white"
        >
          <Search size={20} />
        </button>
      </div>
    </header>
  );
}
