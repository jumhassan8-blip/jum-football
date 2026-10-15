// ─────────────────────────────────────────────────────────────
// JUM Football · illustrative board for DEVELOPMENT only (§4).
// Imported ONLY behind a NODE_ENV === "development" check, so the
// production bundle never includes the mock fixtures.
// ─────────────────────────────────────────────────────────────

import { MOCK_LIVE_MATCHES, type LiveMatch } from "./leaguesData";

/** True only in development builds — the gate every mock path checks. */
export const isDev = (): boolean => process.env.NODE_ENV === "development";

export function devBoardMatches(): LiveMatch[] {
  return MOCK_LIVE_MATCHES;
}
