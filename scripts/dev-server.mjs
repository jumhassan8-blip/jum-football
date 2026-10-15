#!/usr/bin/env node
// JUM Football · preview server with API proxy
// Serves the static export (out/) AND /api/* (Next route handlers)
// with a single in-process module registry — one deploy unit.
//
//   node scripts/dev-server.mjs           → port 8899
//   PORT=3000 node scripts/dev-server.mjs → custom port
//
// Env (.env.local): API_FOOTBALL_KEY — never exposed to the client.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { join, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = join(ROOT, "out");
const PORT = Number(process.env.PORT ?? 8899);

// load .env.local (no dependency needed)
const envFile = join(ROOT, ".env.local");
if (existsSync(envFile)) {
  const text = await readFile(envFile, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// build stamp — baked into the export HTML <head> at build time
const stampPath = join(ROOT, "build-stamp.txt");
let BUILD_STAMP = "unknown";
try {
  BUILD_STAMP = (await readFile(stampPath, "utf8")).trim();
} catch { /* stamp optional */ }

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// ── API route registry ──
const apiRoutes = new Map(); // "GET /api/live" → handler
const apiDir = join(ROOT, "app", "api");

/** Recursively collect route.ts files → { urlPath, fsPath } (nested routes). */
function collectRoutes(dir, prefix = "/api") {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectRoutes(full, `${prefix}/${entry.name}`));
    } else if (entry.isFile() && entry.name === "route.ts") {
      out.push({ urlPath: prefix, fsPath: full });
    }
  }
  return out;
}

{
  for (const route of collectRoutes(apiDir)) {
    const rel = route.fsPath.slice(apiDir.length + 1).replace(/\/route\.ts$/, "");
    const { tsImport } = await import("tsx/esm/api");
    const mod = await tsImport(`../app/api/${rel}/route.ts`, import.meta.url);
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      if (typeof mod[method] === "function") {
        apiRoutes.set(`${method} /api/${rel}`, mod[method]);
      }
    }
  }
}

async function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(normalize(urlPath)).replace(/^\/+|\/$/g, "");
  if (p.includes("..")) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  let file = join(OUT, p);
  try {
    let stat = existsSync(file) && !p.endsWith("/");
    if (!stat) {
      // trailing-slash export: /live → live/index.html
      file = join(OUT, p, "index.html");
      stat = existsSync(file);
    }
    if (!stat) {
      // root and extensionless paths: try out/<p>.html, then index.html
      if (!extname(p)) {
        const asFile = join(OUT, `${p}.html`);
        if (existsSync(asFile)) {
          file = asFile;
          stat = true;
        }
      }
      if (!stat && (p === "" || p === "/")) {
        file = join(OUT, "index.html");
        stat = existsSync(file);
      }
    }
    if (!stat) {
      file = join(OUT, "404.html");
      if (!existsSync(file)) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end(await readFile(file));
      return;
    }
    if (existsSync(file) && !extname(file)) {
      const idx = join(file, "index.html");
      if (existsSync(idx)) file = idx;
    }
    let body = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
    // _next/static chunks are content-hashed → immutable; everything else no-store
    const immutable = file.includes("_next/static");
    const headers = {
      "content-type": type,
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-store",
    };
    if (file.endsWith(".html")) {
      // inject build stamp right after <head ...> so users can verify which build they loaded
      body = Buffer.from(
        body.toString("utf8").replace(/<head[^>]*>/i, (m) => `${m}\n<!-- jum v${BUILD_STAMP} -->`),
        "utf8"
      );
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(500).end("Server error");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  // API routes take priority — a stale static export of /api/* (Next bakes
  // empty/stale prerender bodies into out/) must NEVER shadow the live handler.
  const handler = apiRoutes.get(`${req.method} ${path}`);
  if (handler) {
    try {
      // forward method + headers + body (webhooks POST raw payloads)
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined && k !== "host" && k !== "connection") headers.set(k, v);
      }
      if (body.length && !headers.has("content-type")) headers.set("content-type", "application/json");
      const nextRes = await handler(
        new Request(`http://localhost${req.url}`, { method: req.method ?? "GET", headers, body: body.length ? body : undefined })
      );
      res.writeHead(nextRes.status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(await nextRes.text());
    } catch (e) {
      // API routes must never crash the server
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          fixtures: [],
          source: "live",
          lastUpdated: new Date().toISOString(),
          stale: true,
          quotaGuarded: false,
          error: String(e).slice(0, 120),
        })
      );
    }
    return;
  }
  await serveStatic(req, res, path);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`JUM Football dev server → http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`API routes loaded: ${[...apiRoutes.keys()].join(", ") || "none"}`);
  // server-side push triggers — goal detector polls the CACHED /api/live
  // board (zero extra api-football calls); disabled cleanly without keys
  import("./notifications-server.mjs")
    .then((m) => m.startTriggers({ port: PORT }))
    .catch((e) => console.warn(`[notify] triggers unavailable: ${String(e).slice(0, 100)}`));
});
