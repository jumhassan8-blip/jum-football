# JUM Football — CONTROLS.md

Every clickable element in the app and its behavior. Any element not listed
here is a bug. Last audited: v4 (final form) build, 133 static pages.

## Global chrome (every page)

| Element | Behavior |
|---|---|
| Header logo "J Football" / LIVE pill | → `/match/` |
| Header streak pill (🔥 N) | → `/follow/`; count = persisted daily visit streak (`jum-streak`), toasts "N-day streak 🔥" when a new day bumps it |
| Header avatar icon | → `/follow/` |
| Header search icon | → `/search/` |
| Bottom nav News / Live / Match / Follow / Tips / Stats | → `/news/` `/live/` `/match/` `/follow/` `/tips/` `/stats/`; active tab lime via pathname; LIVE tab: pulsing lime ring while on `/live`, red count badge (live matches from `getMatches`) that disappears at zero |
| Ad slot top (320×100, after header) | AdSense `<ins>` when `NEXT_PUBLIC_ADSENSE_ID` set, else gray "Ad Space · High-RPM Football Audience" placeholder; "ADVERTISEMENT" label always |
| Ad slot mid (300×250, after 3rd content item) | same fallback logic, per page below |
| Ad slot bottom (320×50, sticky above nav) | rendered globally in layout; same fallback logic |
| `/ads.txt` | placeholder ads.txt in public/ |

### Live `/live/` — All Leagues Live Matches
- LIVE title + pulsing lime dot + "N MATCHES" count badge — visual.
- "All matches →" link → `/match/`.
- League filter chips (🌍 All + 10 leagues from `lib/leaguesData.ts`) — filter list with framer-motion AnimatePresence layout animation; active chip lime.
- League group headers: flag + name + "N LIVE" lime badge.
- Match cards (stagger fade-up 120 ms): minute badge + pulsing dot + scorers line; home logo+name / big score / away logo+name (truncated); Recharts momentum sparkline (lime gradient) with "MOMENTUM" caption, hidden if no data.
- Logo fallback: empty logoUrl or image onError → colored initials circle (name-hash color). Never a broken image.
- Tap card → navigates to `/match/m-gs-fb/` (demo match detail).
- Auto-refresh: 30 s interval + manual refresh FAB (bottom-right, spins while refreshing) — both bump every match minute by +1 (mock).
- Empty state: filtered league with no live matches → centered whistle icon + "No live matches right now — check the schedule".
- Ads: top (after header), mid (after 2nd league group), bottom sticky (global).
- State: useState for active league + matches; filter/group logic memoized.
- "Watch Live" button on every card → `/live/watch/<id>/`.

### Live watch `/live/watch/[id]/` — Live Match View + monetization
- Back arrow → `/live/`; sticky scorebar (logo+name | score+pulsing minute | logo+name) is never blocked during ad breaks.
- PRO button (free) / lime PRO badge (PRO) top-right; PRO button opens the upsell sheet.
- Free user: "Next ad in M:SS" countdown pill under scorebar. At 0:00 a full-screen interstitial (AnimatePresence) shows the 300×250 ad + "Ad break · match resumes in 15s" auto-countdown; main view dims to 25%; closes, timer resets to 10:00. `?debugad` starts the timer at 3s for testing.
- Upsell bottom sheet (auto after 60s of free viewing, dismissible; or via PRO button): "Tired of ads? JUM PRO — $5/month · zero ads · goal alerts · all leagues" → [Go PRO — $5/mo] → mock checkout sheet → "Complete purchase" sets localStorage `jum-pro=true` (config flag `NEXT_PUBLIC_PRO_CHECKOUT=stripe` reserved for real Stripe); [Keep watching free] dismisses.
- PRO user: no timer pill, no interstitial, PRO badge on scorebar.
- Timers pause when the tab is hidden; watch session start persisted (`jum-watch-session`).
- Pitch view: stylized SVG pitch with sweeping lime possession bar + roaming ball dot.
- Live commentary feed: auto-updates every ~20s, newest on top, framer-motion slide-in; mock clock +1 min / 20s.
- Full-width Recharts momentum graph (lime gradient) + JUM PULSE 😱🔥⚽ reaction row (persisted `jum-watch-react-<id>`).

### Match page `/match/`
- Top league row pills (Main · Global · Turkish SL · AFCON ▸ …) — filter fixtures; AFCON pill expands submenu (CAF CL, AFCON Qualifiers, Egyptian PL, Botola Pro) and highlights the group.
- NBA pill — switches to NBA game list.
- LIVE section header + animated pulse line — visual only.
- Match card: bell → toggles persisted alert (`jum-alerts`) + toast; handshake → follows BOTH teams (`jum-follows`), first follow requests Notification permission + confetti burst + "Goal alerts on!"; share → native share sheet, clipboard fallback + toast.
- Odds row (1 X 2) → disclaimer bottom sheet; 1XBET button → affiliate sheet (flag off: "not available in your region").
- "N tipsters" link → `/tips/?match=<id>` filtered view.
- Refresh FAB → spins 900 ms, simulated revalidate + toast "Scores updated".
- Mid ad after the 3rd card of each date group.

### Premium match `/match/[id]` (lifestyleData mock engine)
- Back arrow → `/live/`; LIVE badge in header.
- Scoreboard card: crests with initials fallback, black score pill, red pulsing minute, scorers line.
- **JUM Pressure Index** — Recharts two-area chart (home #B4FF39 / away #FF4D4D), pulsing live dot at current minute, Home/Draw/Away progress bars.
- **JUM RAFFLE** — red pulsing 02:14:33 countdown, 2,431 joined, jersey prize, Home/Draw/Away prediction pills, two score inputs, "Join Raffle — Free" → canvas-confetti burst (dynamic import), persists `jumRaffleJoined`, toast "You joined! Good luck 🍀"; minute > 85 shows "🏆 Winner: Ahmed M. 2-1".
- **Match chat** — streak banner + persisted coins counter 🪙; heart like-match (spring pop + mini confetti, persisted); Top/Latest sort pills; comment input + send → prepends comment, "+10 🪙" floating coin animation, coins persisted; like/reply/share per comment, replies indented; long-press comment → 5 floating emojis; Quick Poll vote with animated width, one vote persisted (+3 🪙); goal toast at 5s ("⚽ GOAL! Galatasaray 2-1 — Icardi 78'"), auto-dismiss 4s; native ad after every 6th comment.
- Floating bottom-nav pill (Home · Live · Leagues · Life · You, Live active).

### Lifestyle `/lifestyle/` — TikTok feed
- Sticky category pills (All Cars Mansions Watches Fashion Family Jets).
- Snap-scroll posts (85vh): avatar + player + team•category pill + Follow (toggles Following, persisted); title + price • brand; right rail like/comment/share/save + views; video badge for isVideo posts.
- Double-tap image → heart burst scale 0→2 + like (persisted); all likes/saves/follows in localStorage; native ad every 4 posts; floating pill with Life active.

### Match detail `/match/[id]`
- Back arrow → `/match/`; share icon → native share / clipboard + toast.
- Pulse / Timeline / Stats tabs — switch panel content; Pulse only renders for live matches.
- JUM Pulse reaction buttons (😱🔥⚽) → increment persisted World Meter counts + toast.
- **Momentum graph** — Recharts 0–90′, home lime / away red, insight line computed from last-10-min window ("Last 10 min: 58% pressure FEN — goal likely").
- **Match like (heart)** → framer-motion spring pop, persists (`jum-like-<id>`), count = base + mine, toast on toggle.
- **Poll "Who will win?"** — Home/Draw/Away buttons; one vote per user (`jum-poll-<id>`), bars animate to %, +3 fan points, toast "Vote locked in ⚽"; voted option shows ✓ and others dim.
- **Raffle card** — "Join — predict the score" persists entry (`jum-raffle-<id>`), +10 fan points, toast "You're in! Prediction saved 🎟"; re-click toasts "Already entered"; FT/closed raffles show mock winner handle.
- **Live Chat** — seeded fans + persisted own messages (`jum-chat-<id>`); input + send button (or Enter) posts as "You" (+5 points); ❤ like toggles count (+1 point); Reply prefills "@name " and focuses input; most-liked comment auto-pinned on top with "🔥 Top Fan" chip; SUPER FAN badges from leaderboard seed.
- Demo clock (1 s = 1′) drives win-probability wave, Comeback Radar, and fires a **goal notification** on each newly-applied goal event (system Notification when permitted, in-app toast always).
- Away-Day Kit card → opens jumesim.com in new tab.
- Mid ad at bottom of the engagement stack.

### Leagues `/leagues/`
- Search field — live filters 80+ leagues/countries/confederations.
- Confederation accordion headers (UEFA…OFC) — expand/collapse country groups with league pill links.
- League pills / search results → `/league/<id>/`.
- Mid ad after the CONMEBOL card.

### League `/league/[id]/`
- Table / Fixtures / Top Scorers tabs — switch content.
- Standings rows with crest + top-4 lime highlight.
- Fixture MatchCards — same controls as match page cards.
- Mid ad after 3rd fixture.
- Top scorers rows → `/player/<id>/` via search only (names not linked here by design).

### Search `/search/`
- Input — debounced grouped results: Teams / Leagues / Players; empty state hint.
- Team rows → `/follow/` (follow flow); league rows → `/league/<id>/`; **player rows → `/player/<id>/`**.
- Mid ad between Teams and Leagues groups.

### News `/news/`
- Headline / World Cup / Hot / Transfers pills — switch source list (mock).
- News rows — visual; **reaction row 😍😡😱😂** under every post: one per user per post, toggle re-click removes, counts persist (`jum-news-react-<id>`), +2 fan points.
- "All Trending News >" → `/news/trending/`.
- Mid ad after 3rd trending row.

### News trending `/news/trending/`
- Pagination "Page x / y" + prev/next — slices the 12-item list.
- Reaction rows on every post (same as news).
- Mid ad after 3rd item of each page.

### Follow `/follow/`
- Search field — filters team grid.
- Team cards — toggle selection (lime ring + ✓); already-followed teams pre-checked.
- Floating "Next > · N" — saves all pending (`jum-follows`), requests Notification permission, confetti + "Goal alerts on!", toast, clears selection.
- Mid ad + **Fans Leaderboard**: seeded fans merged with "You" (points from chat/likes/votes/reactions, `jum-fan-points`); rank 1 crowned 👑; ≥500 pts = SUPER FAN badge; "You" row highlighted.

### Tips `/tips/`
- Match ticker chips → `/tips/?match=<id>` deep link, highlights tipsters on that match.
- Recommend / Accuracy Rate pills + Free – $0 toggle — sort/filter list; empty state when no match.
- Tipster cards — open detail sheet: win/loss history bars, stats, "Unlock" CTA → toast (mock paywall).
- Mid ad after 3rd tipster card.

### Stats `/stats/`
- Sub tabs (EPL · La Liga · …) — switch league dataset.
- Inner pills Tables / Players / Fixtures — switch panel.
- Top-4 rows lime-highlighted; Fixtures rows link to league page.
- Mid ad below the standings table.

### Player `/player/[id]`
- Back arrow → `/search/`; team link under name → `/follow/`.
- Stats / Lifestyle / News tabs — switch content.
- Lifestyle grid cards (direct images.unsplash.com URLs): ❤ like (spring pop, persists, +1 point), share icon (native share / clipboard + toast), 🔖 save (persists, toast) — per post.
- Top ad below header.

## Data seam

Components import only from `lib/api.ts`; mock data in `lib/jumMock.ts`.
localStorage keys: `jum-alerts`, `jum-follows`, `jum-react-*`, `jum-like-*`,
`jum-poll-*`, `jum-raffle-*`, `jum-chat-*`, `jum-streak`, `jum-fan-points`,
`jum-news-react-*`, `jum-post-like-*`, `jum-post-save-*`.


## Match detail wiring (dynamic `/match/[id]`)

### Entry points — every match card navigates, zero dead cards
- `/live/` match cards (`LiveCard` in `app/live/page.tsx`): whole card is a
  `motion.button`, `whileTap={{ scale: 0.98 }}` pressed state, pushes
  `/match/{id}/`. Before pushing, saves `sessionStorage jum-live-scroll`.
  aria-label: `Watch {home} vs {away}`.
- `/match/` tab cards (`MatchCard`): team row + odds row wrapped in
  `Link /match/{id}/`; bell / handshake / share / 1XBET buttons are
  independent working controls.
- `/stats/` fixture rows → league pages; `/tips/` match links → `/match/{id}/`.

### `/match/[id]/` (server page + `MatchScreen` client component)
- Data lookup: `mockMatchById(Number(params.id))` from `lib/lifestyleData.ts`
  (5 premium matches, ids 1–5) — falls back to `MOCK_MATCHES[0]`
  (Galatasaray 2-1 Fenerbahce) when the id is not numeric / not found.
- `generateStaticParams` covers ids 1–5 plus all `/match/`-tab slug ids
  (`m-gs-fb`, `m-nas-hil`, …) so slug cards open the momentum screen too.
- Loading state: `ready` gate shows a scoreboard + chart skeleton for ~350 ms
  on every detail open.

### Match screen controls (`components/MatchScreen.tsx`)
- Back button: if `sessionStorage jum-live-scroll` exists → `router.back()`
  (restores originating list); else → `/live/`.
- Scoreboard: crests with onError → hash-colored initials badge; big score;
  pulsing red minute; scorers line.
- `MatchEngine`: momentum wave + Home/Draw/Away bars + raffle card
  (countdown, prediction pills, score inputs, Join → confetti + persist
  `jumRaffleJoined`, winner after 85′).
- `PredictionPoll` (new): "Who will win?" — three options (home/draw/away),
  tap to vote, bars animate (spring), one vote per user per match, persisted
  `jum-pred-{id}`, toast "Prediction locked in ⚽", "You picked …" label.
- `MatchChat` (match-aware via props `matchId/home/away`): streak banner,
  coins, like-match heart (12.4k, persists `jumMatchLiked`, spring + confetti),
  Top/Latest sort, comment input + send (prepends, +10 🪙 float, persists
  `jumCoins`), comment ❤/reply/share, long-press emoji burst, second poll
  (persists `jumPollVote`), goal toast at 5 s, native ad every 6th comment.

### List restore (`/live/`)
- Mount effect reads `jum-live-filter` + `jum-live-scroll` from
  sessionStorage behind a `ready` gate (skeleton while restoring); filter
  persists on change once ready; scroll re-applied after content renders.

localStorage keys added: `jum-pred-{id}`, `jumMatchLiked`, `jumPollVote`,
`jumCoins`, `jumRaffleJoined`. sessionStorage keys: `jum-live-scroll`,
`jum-live-filter`.


## Live Watch Room `/live/watch/[id]` (v2 — full platform)

Entry from every `/live/` card via the "▶ Watch Live" CTA (saves list
scroll state, uses `router.back()` on return).

### Video stage (simulated broadcast)
- Animated SVG pitch: 10 player dots (lime home / red away) + ball, all
  `transform`-based 60fps loops; possession sweep; pause overlay when paused.
- Broadcast overlay: score bug top-left (crests, score, pulsing minute),
  league badge + `LIVE · Ns behind` top-right, commentary ticker marquee
  along the bottom.
- "Simulated feed — live video coming soon" chip — dismissible (X).
- `videoUrl` field on `LiveMatch` (empty) — a real HLS URL swaps the SVG
  for a `<video>` with zero other UI changes.
- Quality pills Auto · 720p · 1080p (persisted `jum-watch-quality`).
  720p/1080p locked for free users (lock icon → opens PRO upsell); PRO
  unlocked. Settings gear → sheet (quality, latency, feed info).

### Orientation
- Portrait: 16:9 stage in flow; quality row, momentum wave + home/away
  win-probability bars, live chat below; BottomNav present.
- Landscape (rotate icon OR physical rotation): full-bleed fixed stage,
  16:9 centered; chat becomes slide-over drawer (chat button or edge
  swipe from right); swipe down exits; rotating back to portrait exits
  fullscreen automatically; BottomNav hidden.

### Player gestures & controls
- Single tap: fade player controls; controls auto-hide after 3s idle
  (any pointer activity re-shows). Double tap: ❤️ burst over the video,
  count persisted (`jum-watch-burst-{id}`) and shown on the Momentum card.
- Buttons: pause/play, Match Center (`/match/{id}`), share, chat drawer
  (landscape), PiP (native API; toast fallback on simulated feed),
  rotate, fullscreen (native Fullscreen API on the stage).

### Engagement
- Share: `navigator.share` prefilled `🔴 LIVE: {home} {score} {away}
  ({minute}') — watch on JUM Football` + URL; clipboard + toast fallback.
- Live chat: send (+10 🪙 float, persisted `jumCoins`), ❤️ like any
  comment/reply (red heart, count persists `jum-watch-cl-{matchId}`),
  Reply → indented border-l thread with "Replying to @x" mention,
  long-press (500ms) → floating emoji burst, 🔥 TOP FAN / PRO badges,
  viewer counter.

### Monetization (`AD_INTERVAL_SECONDS = 15` at top of `LiveWatch.tsx`)
- Free: countdown pill "Next ad in M:SS" always visible under the score
  bug; every 15s of viewing (tab-visible, unpaused) → 15s interstitial
  overlay with ad placeholder, skip disabled for first 5s ("Skip in Ns"
  → "Skip ad"), auto-resume + interval reset. Score bug stays visible,
  dimmed, never hidden. `?debugad` compresses the first break to 3s.
- Upsell sheet after 60s free viewing; persistent "Go PRO" header button;
  interstitial "Go PRO" shortcut. Mock checkout ($5/mo) sets `jum-pro`.
- PRO: zero ads (no pill, no interstitial), PRO badge in header, quality
  selector unlocked. `jum-pro` shared across the whole app.

localStorage keys: `jum-pro`, `jum-watch-quality`, `jum-watch-burst-{id}`,
`jum-watch-cl-{matchId}`, `jumCoins`, `jum-watch-session`.

## Localization & Accounts (v5)
- **i18n**: 17 locales (`/locales/*.json`, 237 keys each) — en es fr de tr ar pt it ru hi zh ja ko id th vi sw. Device auto-detect on first launch → persisted `jum-locale`; Profile → Language grid sets locale (checkmark on active). Missing key → English fallback + `[i18n]` console warning. Arabic (`ar`) flips `document.dir=rtl` — whole layout mirrors.
- **Auth**: silent anonymous session on first launch; guests keep everything (coins/follows/likes stay in localStorage). Profile → "Sign in" `/profile/login/`, "Create account" `/profile/signup/` — email + password (+confirm), eye toggle (eye-off default, `type="button"`) on every password field, inline validation (email format / password ≥ 8 / confirm match). Signup links the anonymous session so local progress carries over.
- **Demo mode** (no `NEXT_PUBLIC_FB_FOOTBALL_API_KEY`): all auth runs on a localStorage mock (`jum-auth-demo*`), including a "Simulate verified email (demo)" button on the verify screen. Real keys → real Firebase Auth; see FIREBASE_SETUP.md for the 4-step console checklist (Email/Password + Anonymous, Gmail SMTP 587, authorized domains, "JUM Football" sender name).
- **Verification** `/profile/verify/`: "We sent a verification link to {email}" + Resend (60s cooldown, max 3/hour) + "I've verified — check status" + "I'll verify later". Verified → confetti + "Email verified — welcome to JUM Football 🎉" toast → back to Profile.
- Profile `/profile/`: account card (email or Guest + hint, verified badge, coins row), sign out (→ fresh guest), soft prompt "Create a password to keep your coins and follows forever" for guests with local progress.

## Logo layer (v6) — API-ready, zero broken images
- `lib/logoHelper.ts` is the only logo resolver: P1 API logo (`logo`/`logoUrl`) → P2 numeric `id`/`crestId` (crests.football-data.org) → P3 known-name map (incl. Somali clubs via flagcdn) → P4 `""` → initials. Accepts a plain name string OR any team-shaped object — 10,000 future API clubs need zero edits.
- `components/TeamLogo.tsx` is the ONLY component that renders a club logo `<img>` (grep-verified). Any failure — empty src, 404, offline — falls back to a local initials circle (hash color, white text). Optional `initials`/`color`/`fg`/`ring` overrides keep brand styling (TeamBadge short codes, ClubLogo rings).
- `components/FanAvatar.tsx` renders every fan/player avatar as a local initials circle — no external placeholder services anywhere (pravatar removed); lifestyle post photos (unsplash content) unchanged.
- League logos resolve via `getLeagueLogo` (countryCode → flagcdn, initials fallback).
- Unmapped-team proof: `/match/5/` (Dekedaha vs Horseed, Somali Premier League) — Dekedaha renders a clean initials badge, Horseed its Somalia flag. `/match/1/` renders real Galatasaray/Fenerbahce crests.

## Tips `/tips/` (v7) — analysis-only, fully functional
- **Legal**: zero betting-market language repo-wide (grep-verified). Pick badges read "Both teams score likely" / "High-scoring game expected" / "Home dominance projected" / "Home win lean" etc. MatchCard's numeric strip is a win-chance model projection (H/D/A) with a disclaimer sheet; partner sheet is behind AFFILIATE_ENABLED.
- **Filters**: Recommend (streak order) / Accuracy Rate (hitRate desc, framer-motion layout reorder) / Free-$0 (price === 0 — Amal Omar "Free Daily Insight" card is always there). Empty state → "No analysts here yet — check Recommend".
- **Paywall flow**: View Analysis → sheet with 18+ checkbox gating the Unlock button → tap → 800ms spinner → confetti + success flash → saved to `jum-purchased-tips` → auto-opens Unlocked Analysis View (tipster header, per-pick written reasoning + animated confidence meter, native share prefilled, free tier shows PRO upsell footer).
- **Returning**: purchasedIds → lime-outline "View" opens the analysis directly, no paywall. PRO (banner sheet, mock $5/mo) sets `jum-pro` → every analysis unlocked, no paywall CTAs anywhere.
- **Controls**: per-card Follow (persists `jum-followed-tipsters`, toast), streak/hit-rate pills → honest "How hit rate is calculated" sheet (last 30 published picks), refresh FAB spins + re-sorts, TeamLogo avatars with initials fallback, sticky slot = `<JumAd type="sticky"/>`, all 6 nav items route. All strings via tips.* keys (17 locales).

## Real API layer (v8) — api-sports quota-safe proxy
- `npm run preview` = `scripts/dev-server.mjs`: one process serving the static export in `out/` AND `/api/*` route handlers. Env in `.env.local`: `API_FOOTBALL_KEY` (server-side only; keyless builds serve cached/quiet data gracefully).
- `/api/live` (`app/api/live/route.ts`): adaptive cache (live → 120s, idle → 15min), today's-Super-Lig fallback cached by date (30min, ≤2 fetches/hour), daily quota guard (`QUOTA_EMERGENCY_AT`, default 80 → all TTLs stretch to 60min + `quotaGuarded:true`), 15s in-flight lock (N parallel requests share ONE upstream call), non-200 → last-good cache with `stale:true`. Never errors to the client. Upstream usage logged server-side (`[api-usage]` lines, see `lib/apiUsage.ts` + README "API quota").
- `/live/`: polls `/api/live` every 60s; real fixtures render through TeamLogo (initials for crests the free tier lacks), grouped by league with league logos, quota + stale banners, skeletons on first load, "Updated N min ago". When football is quiet: today's fallback rows + mock live block so the tab never looks dead.
- `/tips/`: also polls `/api/live`; picks matching a live fixture get a red "Live now 🔴" chip; silent mock fallback when the API is quiet.
- Test: `node scripts/quota-test.mjs` (QUOTA_EMERGENCY_AT=2 → guard engages, TTLs stretch).
