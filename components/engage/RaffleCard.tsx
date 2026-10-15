"use client";

import { useMemo } from "react";
import { Gift, Trophy } from "lucide-react";
import type { Match } from "@/lib/jumMock";
import { raffleFor } from "@/lib/api";
import { awardFanPoints, useRaffleEntry, useToast } from "@/lib/store";

/** Raffle card — Join saves the entry, FT matches show the mock draw winner. */
export default function RaffleCard({ match }: { match: Match }) {
  const raffle = useMemo(() => raffleFor(match.id), [match.id]);
  const { joined, join } = useRaffleEntry(raffle?.id ?? match.id);
  const toast = useToast();

  if (!raffle) return null;
  const ft = match.status === "ft";

  return (
    <section className="relative overflow-hidden rounded-card bg-card p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-xl"
        style={{ backgroundColor: raffle.brandColor }}
      />
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${raffle.brandColor}22`, color: raffle.brandColor }}
        >
          {raffle.closed ? <Trophy size={19} /> : <Gift size={19} />}
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: raffle.brandColor }}>
            JUM Raffle
          </p>
          <p className="mt-0.5 text-[13px] font-bold leading-snug">{raffle.prize}</p>
          {raffle.closed && raffle.winnerHandle ? (
            <p className="mt-2 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-dim">
              Draw complete — winner <span className="font-bold text-gold">{raffle.winnerHandle}</span>. New raffle drops at the next fixture.
            </p>
          ) : ft ? (
            <p className="mt-2 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-dim">
              Entries closed — draw follows full time.
            </p>
          ) : (
            <button
              onClick={() => {
                if (join()) {
                  awardFanPoints(10);
                  toast("You're in! Prediction saved 🎟");
                } else {
                  toast("Already entered — good luck!");
                }
              }}
              className={`mt-2.5 w-full rounded-lg py-2.5 text-[12px] font-black transition ${
                joined
                  ? "bg-white/[0.06] text-dim"
                  : "bg-accent text-bg hover:brightness-110"
              }`}
            >
              {joined ? "✓ Entry saved" : "Join — predict the score"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
