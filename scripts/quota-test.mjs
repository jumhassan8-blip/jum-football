// Emergency-mode test: QUOTA_EMERGENCY_AT=2 → guard must engage by the 2nd call.
// Run: node scripts/quota-test.mjs
process.env.QUOTA_EMERGENCY_AT = process.env.QUOTA_EMERGENCY_AT ?? "2";
const { tsImport } = await import("tsx/esm/api");
const mod = await tsImport("../app/api/live/route.ts", import.meta.url);
const get = async () => (await mod.GET()).json();

const r1 = await get();
console.log(`call1: used=${r1.quota.used}/${r1.quota.limit} guarded=${r1.quotaGuarded}`);
const r2 = await get();
console.log(`call2: used=${r2.quota.used}/${r2.quota.limit} guarded=${r2.quotaGuarded}`);
const r3 = await get();
console.log(`call3: used=${r3.quota.used}/${r3.quota.limit} guarded=${r3.quotaGuarded} stale=${r3.stale}`);

if (r2.quotaGuarded || r3.quotaGuarded) {
  console.log("EMERGENCY ENGAGED ✓ — TTLs now 60min, UI banner will show");
} else {
  console.log("EMERGENCY NOT ENGAGED ✗");
  process.exit(1);
}
