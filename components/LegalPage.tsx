import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft } from "lucide-react";

/** Shared shell for the legal pages (privacy / terms / about / contact). */
export default function LegalPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <Link
          href="/profile/"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-dim transition-colors hover:text-white"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="pt-3 text-[20px] font-extrabold text-white">{title}</h1>
        {subtitle && <p className="pt-1 text-[12px] text-dim">{subtitle}</p>}
        <div className="legal-prose pt-4">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
