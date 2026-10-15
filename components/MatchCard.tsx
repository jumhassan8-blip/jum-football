"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Handshake, Share2 } from "lucide-react";
import type { Match } from "@/lib/jumMock";
import { AFFILIATE_ENABLED, leagueById, teamById } from "@/lib/api";
import { fireConfetti, useAlerts, useToast } from "@/lib/store";
import { canonicalTeamName, useFollowedTeams } from "@/lib/follows";
import { requestPushAndStoreToken } from "@/lib/messaging";
import TeamBadge from "./TeamBadge";
import Sheet from "./Sheet";
import { useT } from "@/lib/i18n";

export default function MatchCard({ match }: { match: Match }) {
  const t = useT();
  const home = teamById(match.homeId)!;
  const away = teamById(match.awayId)!;
  const league = leagueById(match.leagueId);
  const toast = useToast();
  const { on: alertsOn, toggle: toggleAlerts } = useAlerts(match.id);
  const { ids: follows, toggle: toggleFollow, uid: fanUid } = useFollowedTeams();
  const following =
    follows.includes(canonicalTeamName(match.homeId)) || follows.includes(canonicalTeamName(match.awayId));
  const [sheet, setSheet] = useState<"winChance" | "affiliate" | null>(null);
  const upcoming = match.status === "ns";
  const live = match.status === "live";

  const share = async () => {
    const text = `${home.name} ${match.homeScore}-${match.awayScore} ${away.name} · JUM Football`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "JUM Football", text });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Match link copied to clipboard");
    } catch {
      toast("Sharing not available here");
    }
  };

  return (
    <div className="border-b border-divider px-4 py-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-dim">
          {league?.name} {match.round}
        </span>
        <Link
          href={`/match/${match.id}/`}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            live ? "bg-accent text-bg" : "bg-black text-white"
          }`}
        >
          {live ? `${match.minute ?? 0}'` : `${match.homeScore} - ${match.awayScore}`}
        </Link>
        <Link href={`/tips/?match=${match.id}`} className="font-semibold text-live">
          {match.tipsters > 0 ? `${match.tipsters} tipsters` : "·"}
        </Link>
      </div>

      <Link href={`/match/${match.id}/`} className="mt-2 flex items-center gap-2">
        <span className="flex-1 truncate text-right text-[13px] font-semibold">{home.name}</span>
        <TeamBadge team={home} size={26} />
        <span className="flex h-7 min-w-[52px] items-center justify-center bg-black px-2 text-[13px] font-bold tabular-nums">
          {match.homeScore} - {match.awayScore}
        </span>
        <TeamBadge team={away} size={26} />
        <span className="flex-1 truncate text-[13px] font-semibold">{away.name}</span>
      </Link>

      {!upcoming && (
        <div className="mt-1.5 space-y-0.5 text-[11px] text-dim">
          {match.homeScorers?.length ? <p className="text-right">{match.homeScorers.join("  ")}</p> : null}
          {match.awayScorers?.length ? <p>{match.awayScorers.join("  ")}</p> : null}
        </div>
      )}

      {/* controls row */}
      <div className="mt-2 flex items-center gap-1.5">
        <button
          onClick={() => {
            toggleAlerts();
            toast(alertsOn ? "Match alerts off" : "🔔 Match alerts on — we'll ping you");
          }}
          aria-label={t("a11y.toggleAlerts")}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            alertsOn ? "bg-accent/15 text-accent" : "text-dim hover:bg-white/5 hover:text-white"
          }`}
        >
          {alertsOn ? <BellRing size={16} /> : <Bell size={16} />}
        </button>
        <button
          onClick={() => {
            if (!following) {
              toggleFollow(match.homeId);
              toggleFollow(match.awayId);
              // in-context permission ask — the follow tap IS the gesture
              void requestPushAndStoreToken(fanUid);
              fireConfetti();
              toast("Added to FOLLOW tab");
            } else {
              toggleFollow(match.homeId);
              toggleFollow(match.awayId);
              toast("Removed from FOLLOW tab");
            }
          }}
          aria-label={t("a11y.followTeams")}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            following ? "bg-accent/15 text-accent" : "text-dim hover:bg-white/5 hover:text-white"
          }`}
        >
          <Handshake size={16} />
        </button>
        <button
          onClick={share}
          aria-label={t("common.share")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-white/5 hover:text-white"
        >
          <Share2 size={16} />
        </button>

        {match.winChance && (
          <button
            onClick={() => setSheet("winChance")}
            className="ml-auto flex items-center gap-2 text-[11px] font-semibold text-dim"
          >
            H <span className="tabular-nums text-white">{match.winChance.home.toFixed(2)}</span>
            <span className="text-text-faint">|</span> D{" "}
            <span className="tabular-nums text-white">{match.winChance.draw.toFixed(2)}</span>
            <span className="text-text-faint">|</span> A{" "}
            <span className="tabular-nums text-white">{match.winChance.away.toFixed(2)}</span>
          </button>
        )}
        {match.winChance && (
          <button
            onClick={() => setSheet("affiliate")}
            className="rounded bg-black px-2 py-1 text-[10px] font-bold text-dim"
          >
            Partner &gt;
          </button>
        )}
      </div>

      <Sheet open={sheet === "winChance"} onClose={() => setSheet(null)} title={t("match.winChanceTitle")}>
        <p className="text-[13px] leading-relaxed text-dim">
          Win-chance scores are model projections from mock data, shown for
          information only. Football is unpredictable — analysis is never a
          guarantee.{" "}
          <span className="font-bold text-white">18+ only.</span>
        </p>
        <button
          onClick={() => setSheet(null)}
          className="mt-4 min-h-[44px] w-full rounded-lg bg-accent text-[13px] font-bold text-bg"
        >
          I understand
        </button>
      </Sheet>

      <Sheet open={sheet === "affiliate"} onClose={() => setSheet(null)} title={t("match.partnerTitle")}>
        {AFFILIATE_ENABLED ? (
          <a
            href="https://partner.example/aff/jum"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-bg"
          >
            Continue to partner site
          </a>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-dim">
              Affiliate links are disabled in this build (config flag{" "}
              <code className="rounded bg-black px-1 text-accent">AFFILIATE_ENABLED=false</code>).
              Enable it in <code className="rounded bg-black px-1">lib/api.ts</code> to route to the
              partner URL.
            </p>
            <button
              onClick={() => setSheet(null)}
              className="mt-4 min-h-[44px] w-full rounded-lg bg-accent text-[13px] font-bold text-bg"
            >
              Close
            </button>
          </>
        )}
      </Sheet>
    </div>
  );
}
