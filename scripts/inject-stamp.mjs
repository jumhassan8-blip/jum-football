#!/usr/bin/env node
// Physically injects <!-- jum v<stamp> --> into every exported HTML file
// (postbuild) so ANY static server — including the preview platform —
// reveals which build it serves. dev-server.mjs also injects at request
// time, so this is belt-and-braces.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let stamp = "unknown";
try {
  stamp = readFileSync(join(root, "build-stamp.txt"), "utf8").trim();
} catch { /* keep unknown */ }
const outDir = join(root, "out");
const marker = `<!-- jum v${stamp} -->`;

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith(".html")) {
      const html = readFileSync(full, "utf8");
      if (!html.includes(marker)) {
        writeFileSync(full, html.replace(/<head[^>]*>/i, (m) => `${m}\n${marker}`));
      }
    }
  }
}

if (existsSync(outDir) && statSync(outDir).isDirectory()) {
  walk(outDir);
  console.log(`[stamp] injected ${marker} into out/**/*.html`);
}
