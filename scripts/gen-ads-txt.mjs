/**
 * Generates public/ads.txt at build time (npm prebuild) from the AdSense
 * client ID in .env.local — works on any domain since ads.txt carries no
 * domain. Falls back to the exact placeholder line when unconfigured:
 *
 *   google.com, pub-YOUR_PUB_ID, DIRECT, f08c47fec0942fa0
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

let client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

if (!client && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*NEXT_PUBLIC_ADSENSE_CLIENT\s*=\s*(\S+)\s*$/);
    if (m) {
      client = m[1];
      break;
    }
  }
}

client = client.trim();
// Reject paste-here placeholders just like the runtime does.
if (!client || /paste|your|xxxx|placeholder|example/i.test(client)) client = "";

const pubId = client ? client.replace(/^ca-/, "") : "pub-6142293533783643";
const line = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;

writeFileSync("public/ads.txt", `${line}\n`);
console.log(`[ads.txt] ${line}`);
