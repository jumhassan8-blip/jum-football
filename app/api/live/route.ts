// ─────────────────────────────────────────────────────────────
// JUM Football · /api/live — quota-safe proxy for api-sports.
// Thin route wrapper around lib/liveCore.ts (shared cache layer).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { handleGroup, handle, quotaGuarded, GROUPS } from "@/lib/liveCore";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const group = url.searchParams.get("group");
    if (group && GROUPS[group]) return await handleGroup(group);
    return await handle();
  } catch {
    // absolute last resort: never return an error to the client
    return NextResponse.json({
      fixtures: [],
      source: "live",
      lastUpdated: new Date().toISOString(),
      stale: true,
      quotaGuarded: quotaGuarded(),
    });
  }
}

