"use client";

import type { Team } from "@/lib/jumMock";
import TeamLogo from "./TeamLogo";

/**
 * Brand-styled team badge — a thin wrapper over TeamLogo (the only
 * component allowed to render a logo) that keeps the app's short-code
 * + brand-color look for the initials fallback.
 */
export default function TeamBadge({
  team,
  size = 32,
}: {
  team: Team;
  size?: number;
}) {
  return (
    <TeamLogo
      team={{ name: team.name, logo: team.logoUrl, crestId: team.crestId }}
      size={size}
      initials={team.short}
      color={`${team.color}22`}
      fg={team.color}
      ring={team.color}
    />
  );
}
