"use client";

import JumAd from "@/components/JumAd";
import LifestyleFeed from "@/components/LifestyleFeed";
import FloatNav from "@/components/FloatNav";

export default function LifestylePage() {
  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#070709] pb-16 text-white">
      <header className="sticky top-0 z-30 bg-[#070709]/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-[17px] font-black tracking-tight">JUM Lifestyle ✨</h1>
          <span className="rounded-full bg-[#B4FF39]/15 px-2 py-0.5 text-[10px] font-black text-[#B4FF39]">PREMIUM</span>
        </div>
        <JumAd type="top" />
      </header>

      <LifestyleFeed />
      <FloatNav active="Life" />
    </div>
  );
}
