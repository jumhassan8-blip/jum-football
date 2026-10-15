# JUM Football

Live scores, watch rooms, analysis, and a worldwide fan app — Next.js 14 (App Router, static export), TypeScript, Tailwind, Framer Motion, Recharts.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Static export to `out/` |
| `npm run preview` | Serves `out/` **plus** `/api/*` route handlers (one process — this is the deployable unit) |

## API quota (api-sports free plan, 100 requests/day)

`/app/api/live/route.ts` is the only place the `API_FOOTBALL_KEY` appears (server-side). Put it in `.env.local`:

```
API_FOOTBALL_KEY=PASTE_KEY_HERE
```

**Adaptive cache** — the core optimization:

- **Live matches exist** → 120s cache → ≤30 requests/hour, only while games are on
- **No live matches** → 15-minute cache → ≤96 requests/day (usually far fewer)
- **Daily quota guard** at `QUOTA_EMERGENCY_AT` (default 80): every TTL stretches to 60min and the response sets `quotaGuarded:true` so the UI shows "Live updates paused to save quota — back tomorrow"
- **Fallback**: when live is empty, today's Super Lig fixtures are fetched and cached separately by date (30min TTL, max 2 fetches/hour)
- **In-flight lock**: parallel requests within 15s share ONE upstream call — 1,000 users loading in the same minute = exactly 1 upstream request
- **Failures**: non-200 or network errors serve the last good cache with `stale:true`; the client never sees a 429 and never crashes
- Env knobs: `QUOTA_DAILY_LIMIT` (100), `QUOTA_EMERGENCY_AT` (80)

Client polls `/api/live` every 60s (matching cache granularity — faster polling only burns serverless executions).

## Testing quota guard

```bash
QUOTA_EMERGENCY_AT=3 npm run preview
# then: curl -s localhost:8899/api/live | jq .quota   (watch used climb)
# after 3 upstream calls, quotaGuarded flips true and TTLs stretch to 60min
```

## Real-time news (no quota)

`/api/news` aggregates RSS feeds (BBC Sport Football, ESPN FC, GOAL + Sky Sports backup) with a 15-min server cache and all-settled semantics: feeds that fail are skipped, the last good batch is served with `stale:true`, and the news tab shows an "offline" chip instead of going empty. RSS bypasses the api-football quota entirely (no API key).

## AFCON confederation group

`/api/live?group=afcon` resolves league IDs at runtime via `/leagues?search=` (cached 24h — IDs are never hardcoded), then makes ONE `fixtures?live=all&league=…` call and ONE `next=12` call across all resolved leagues (hyphen-joined IDs — same 2-call quota profile as the main route). Live CAF games group by competition; when none are live the tab shows "Next: AFCON qualifiers" from the `next` batch.

## Firebase chat (Firestore) — free tier

Live chat lives in `matches/{matchId}/comments` (`{ uid, name, text, likes[], replies[], reactions{}, createdAt }`), ~1s cross-device via `onSnapshot`; reports go to `reported/`. Anonymous Auth signs in silently on first launch (enable **Anonymous** in the Firebase console — see `FIREBASE_SETUP.md`).

**Free tier**: 50k reads/day (Spark plan) — a match with 500 concurrent chatters polling via snapshot costs ~50 reads/min, well within budget. Upgrade path (documented, not built): Blaze pay-as-you-go + `onDisconnect` presence + BigQuery export for analytics.

Firestore security rules mirroring the client guards:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    match /matches/{mid}/comments/{cid} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.text is string
        && request.resource.data.text.size() <= 280
        && request.resource.data.uid == request.auth.uid;
      allow update: if signedIn()
        && !request.resource.data.diff(resource.data).affectedKeys()
             .hasAny(['uid', 'name', 'text', 'createdAt']); // likes/replies/reactions only
    }
    match /reported/{rid} {
      allow create: if signedIn();
      allow read, update, delete: if false;
    }
  }
}
```

Client-side guards (also enforced in `lib/chatStore.ts` consumers): 280-char max, 1 comment per 5s per uid, latest 200 per match + "Load earlier", listener detaches while the tab is hidden.

## Push notifications (FCM web push) + viewer presence

- **Goal alerts** — the dev-server process polls the **cached** `/api/live` board every 60s (zero extra api-football calls — it reuses the proxy cache), diffs goals/status per fixture, and fans out FCM to followers of both teams (`users/{uid}` where `follows` array-contains the team). Sends are batched ≤500 tokens/batch; `NotRegistered`/`InvalidRegistration` tokens are pruned on the spot. Kick-off and full-time alerts are opt-in per user; goals are on by default ("Goals only" plan). News digest: max 1/hour, deduped by link.
- **Permission flow** — asked on the first FOLLOW (the tap is the user gesture), never on app open; fallback "Enable goal alerts 🔔" banner in the FOLLOW tab; `denied` shows re-enable instructions instead of nagging. Tokens: `users/{uid}/tokens/{token}`. Follows live in `users/{uid}/follows` (Firestore) so the server can target teams — demo mode keeps the localStorage echo.
- **Setup** — VAPID key pair + Server key + service account, all in `FIREBASE_SETUP.md` §5. `FCM free tier` is fine at any realistic scale; every send is logged (`[notify] … sent=N pruned=N`). Missing keys → triggers log `disabled` and the app runs fully without push (fail-closed).
- **Viewer presence** — `matchWatchers/{matchId}/online/{uid}` written on watch-screen open with a 60s `lastSeen` heartbeat. Firestore has no `onDisconnect` (that's a Realtime-Database primitive), so server-side cleanup runs in the same dev-server process: a sweeper reaps docs whose heartbeat is older than 150s and recomputes the aggregate counter — survives crashes/tabs closed, zero new infra. A batched counter doc (`matchWatchers/{matchId}.count`) is incremented in the same commit as the join and decremented on clean leave, so `/live` cards read one tiny aggregate doc instead of fanning out per-listener. Writes happen only on join/leave (+1 heartbeat/min); the watch screen holds the only per-match listener. Counts anonymous + logged users, deduped by uid per match; one user in two matches counts in both. Privacy: counts only — `online` docs are unreadable to clients (`allow read: if false`), no viewer lists anywhere. UI always says "watching on JUM" — never a worldwide number.

## Firebase / i18n

- `FIREBASE_SETUP.md` — auth console checklist (demo mode works keyless; chat falls back to a local echo store so the UI stays testable)
- 17 locales in `/locales`, `tips.*`-style namespaces, Arabic = full RTL
