#!/usr/bin/env node
// Writes build-stamp.txt; dev-server.mjs + inject-stamp.mjs use it to tag HTML.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
writeFileSync(join(here, "..", "build-stamp.txt"), stamp + "\n");
console.log(`[stamp] build id: ${stamp}`);
