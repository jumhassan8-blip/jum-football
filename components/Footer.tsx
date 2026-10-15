"use client";

import Link from "next/link";

const LINKS: { href: string; label: string }[] = [
  { href: "/privacy/", label: "Privacy" },
  { href: "/terms/", label: "Terms" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
  { href: "/referee/", label: "Referee Fairness" },
  { href: "/pressure/", label: "Attack Pressure" },
];

/** Global footer — rendered in the root layout above the bottom nav. */
export default function Footer() {
  return (
    <footer className="border-t border-divider bg-bg/60 pb-24 pt-6">
      <div className="mx-auto max-w-lg px-4 lg:max-w-3xl">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] font-bold text-dim transition-colors hover:text-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="pt-4 text-[10px] text-dim/60">© 2026 Jum Football</p>
      </div>
    </footer>
  );
}
