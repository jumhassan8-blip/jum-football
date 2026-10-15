"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { findRefByName, type Referee } from "@/lib/fanintel";
import { trackEvent } from "@/lib/analytics";

type ApiFixture = {
  fixture: { id: number; referee: string | null };
};

/**
 * Match-page referee chip: when the live fixture behind this route has a
 * referee whose name matches referees.json, show a "Fan-rated" chip that
 * deep-links to the referee's fairness page. Renders nothing otherwise.
 */
export default function RefMatchChip({ routeId }: { routeId: string }) {
  const t = useT();
  const [ref, setRef] = useState<Referee | null>(null);

  useEffect(() => {
    let cancelled = false;
    // /live cards deep-link with /match/1{last5(fixtureId)} — invert that
    const fixtureId = routeId.startsWith("1") ? Number(routeId.slice(1)) : NaN;
    if (!Number.isFinite(fixtureId)) return;
    const suffix = String(fixtureId); // last5 of the real id
    fetch("/api/live", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { fixtures: [] }))
      .then((json: { fixtures?: ApiFixture[] }) => {
        if (cancelled) return;
        const fx = (json.fixtures ?? []).find((f) => String(f.fixture.id).endsWith(suffix));
        if (!fx) return;
        const match = findRefByName(fx.fixture.referee);
        if (!cancelled && match) setRef(match);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  if (!ref) return null;
  return (
    <Link
      href={`/referee/${ref.id}/`}
      onClick={() => trackEvent("ref_match_chip_tapped", { ref_id: ref.id })}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black text-accent ring-1 ring-accent/30 transition-colors hover:bg-accent/20"
    >
      <span className="uppercase tracking-wide">{t("fanintel.fanRated")}</span>
      <span className="text-white">
        {t("fanintel.matchChip", { name: ref.name, score: ref.fairnessScore.toFixed(1) })}
      </span>
    </Link>
  );
}
