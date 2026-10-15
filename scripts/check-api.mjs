#!/usr/bin/env node
// JUM Football · API connection & quota check
// Confirms the API-Football key is valid and prints plan/quota usage.
//
//   node scripts/check-api.mjs
//
// Reads API_FOOTBALL_KEY from .env.local — never hardcode your key.
// The /status endpoint is free: it does NOT consume request quota.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const BASE = "https://v3.football.api-sports.io";
const ENV_KEYS = ["API_FOOTBALL_KEY"]; // tried in order

// --- load .env.local (same loader as scripts/dev-server.mjs) ---
const envFile = join(ROOT, ".env.local");
if (existsSync(envFile)) {
  const text = await readFile(envFile, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const KEY = ENV_KEYS.map((k) => process.env[k]).find(Boolean);
if (!KEY) {
  console.error("API key not found. Set API_FOOTBALL_KEY in .env.local");
  process.exit(2);
}

// --- call the free /status endpoint ---
let res, body;
try {
  res = await fetch(`${BASE}/status`, {
    headers: { "x-apisports-key": KEY },
  });
  body = await res.json();
} catch (err) {
  console.error(`Network error — could not reach ${BASE}: ${err.message}`);
  process.exit(3);
}

const errors = body?.errors ?? {};
const errText = Object.values(errors).filter(Boolean).join(" | ").toLowerCase();

// --- classify the failure by API-Football's exact error messages ---
if (!res.ok || Object.keys(errors).length > 0) {
  if (errText.includes("token") || errText.includes("key") || res.status === 401 || res.status === 403) {
    console.error("API key invalid — check API_FOOTBALL_KEY in .env.local");
  } else if (errText.includes("subscription") || errText.includes("expired") || errText.includes("upgrade")) {
    console.error("API expired or subscription inactive — renew your plan");
  } else if (
    errText.includes("limit") || errText.includes("quota") || errText.includes("rate") ||
    res.status === 429
  ) {
    console.error("Out of quota — daily request limit reached, resets at 00:00 UTC");
  } else {
    console.error(`API error (HTTP ${res.status}):`, errors);
  }
  process.exit(1);
}

// --- success: print plan + quota ---
const { subscription, requests, account } = body.response;
console.log("API is working ✓");
console.log(`  account : ${account?.firstname ?? ""} ${account?.lastname ?? ""}`.trim());
console.log(`  plan    : ${subscription?.plan ?? "?"}, status: ${subscription?.status ?? "?"}, active: ${subscription?.active ?? "?"}`);
console.log(`  quota   : ${requests?.current ?? "?"}/${requests?.limit ?? "?"} requests used today (${requests?.total ?? "?"} total)`);
if (subscription?.active === false) {
  console.log("  ⚠ subscription inactive — API will reject real data calls");
  process.exit(1);
}
