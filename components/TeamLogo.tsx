"use client";

import { useState } from "react";
import {
  getTeamLogo,
  teamColor,
  teamInitials,
  type TeamLike,
} from "@/lib/logoHelper";

/**
 * The ONLY way a club logo renders anywhere in the app.
 *
 * Resolves src via getTeamLogo (API logo → crest id → known-name map);
 * any failure — empty src, 404, network error — falls back to a local
 * initials circle. Never a broken image, never an external placeholder
 * service: the fallback is local and always available.
 *
 * API-READY: accepts a plain name string or any team-shaped object,
 * so 10,000 clubs from a future API need zero manual additions.
 *
 * Optional `initials` / `color` overrides let brand-styled callers
 * (TeamBadge with short codes) keep their look.
 */
export default function TeamLogo({
  team,
  size = 28,
  initials,
  color,
  fg = "#ffffff",
  ring,
}: {
  team: TeamLike;
  size?: number;
  /** override the initials text (e.g. brand short codes) */
  initials?: string;
  /** override the initials background color */
  color?: string;
  /** override the initials text color */
  fg?: string;
  /** optional ring color around the badge */
  ring?: string;
}) {
  const [src, setSrc] = useState<string>(() => getTeamLogo(team));
  const label = initials ?? teamInitials(team);
  const bg = color ?? teamColor(team);
  const name = typeof team === "string" ? team : (team?.name ?? "team");

  if (!src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full font-bold"
        style={{
          width: size,
          height: size,
          backgroundColor: bg,
          color: fg,
          border: ring ? `1.5px solid ${ring}` : undefined,
          fontSize: size * (label.length >= 3 ? 0.3 : 0.4),
        }}
        aria-label={name}
        role="img"
      >
        {label}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setSrc("")}
      className="shrink-0 rounded-full object-contain"
      style={{ width: size, height: size }}
    />
  );
}
