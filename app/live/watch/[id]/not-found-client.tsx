"use client";

import Link from "next/link";

export default function WatchNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-white">
      <p className="text-[14px] font-bold">Match not found</p>
      <Link href="/live/" className="rounded-full bg-accent px-4 py-2 text-[12px] font-black text-bg">
        Back to live matches
      </Link>
    </div>
  );
}
