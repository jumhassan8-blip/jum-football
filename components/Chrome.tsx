"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStreak, useToast } from "@/lib/store";

const COLORS = ["#C8FF3D", "#6E8BFF", "#FF5C8A", "#FFC94D", "#F2F4F7"];

/** Follow-moment confetti burst, fired via the "jum-confetti" window event. */
export function ConfettiLayer() {
  const [burst, setBurst] = useState<number | null>(null);
  useEffect(() => {
    const on = () => setBurst(Date.now());
    window.addEventListener("jum-confetti", on);
    return () => window.removeEventListener("jum-confetti", on);
  }, []);
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 1400);
    return () => clearTimeout(t);
  }, [burst]);
  return (
    <AnimatePresence>
      {burst && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex justify-center">
          {Array.from({ length: 22 }).map((_, i) => {
            const angle = (i / 22) * Math.PI * 2;
            const dist = 90 + (i % 5) * 26;
            return (
              <motion.span
                key={`${burst}-${i}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist * 0.7 + 60,
                  opacity: 0,
                  scale: 0.4,
                  rotate: 360,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute h-2 w-1.5 rounded-[2px]"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
            );
          })}
          <motion.p
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute top-2 rounded-full bg-accent px-4 py-1.5 text-[12px] font-black text-bg shadow-lg shadow-accent/30"
          >
            Goal alerts on!
          </motion.p>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Daily-visit streak: persists locally, toasts when a new day bumps it. */
export function StreakToast() {
  const { count, bumped } = useStreak();
  const toast = useToast();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!bumped || shown) return;
    setShown(true);
    const t = setTimeout(() => toast(`${count}-day streak 🔥`), 900);
    return () => clearTimeout(t);
  }, [bumped, shown, count, toast]);
  return null;
}
