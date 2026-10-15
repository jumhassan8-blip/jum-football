"use client";

import Link from "next/link";

const ITEMS = [
  { href: "/match/", label: "Home" },
  { href: "/live/", label: "Live" },
  { href: "/leagues/", label: "Leagues" },
  { href: "/lifestyle/", label: "Life" },
  { href: "/follow/", label: "You" },
];

/** Floating bottom-nav pill for the premium screens. */
export default function FloatNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-2 left-1/2 z-40 flex -translate-x-1/2 gap-6 rounded-full border bg-[#1A1A20] px-6 py-3 text-xs font-bold" style={{ borderColor: "#222228" }}>
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className={active === i.label ? "text-[#B4FF39]" : "text-[#888888] hover:text-white"}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
