# Firebase Setup — JUM Football Auth

The app ships in **demo mode**: every auth flow (signup, login, verification, resend,
password reset) runs against a localStorage mock so it's fully testable with zero keys.
To go live with real email verification, create a project and drop the keys in.

## 1. Drop your keys in

Set these env vars before `npm run build` (or add to `.env.local`):

```
NEXT_PUBLIC_FB_FOOTBALL_API_KEY=...
NEXT_PUBLIC_FB_FOOTBALL_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FB_FOOTBALL_PROJECT_ID=your-project
NEXT_PUBLIC_FB_FOOTBALL_APP_ID=...
```

When `NEXT_PUBLIC_FB_FOOTBALL_API_KEY` is missing or `demo-api-key`, demo mode stays on.

## 2. Firebase Console checklist (jum-football project) — REQUIRED before testing, do not skip

1. **Authentication → Sign-in method** → enable **Email/Password** + **Anonymous**
2. **Authentication → Settings → SMTP settings** → `smtp.gmail.com`, port **587**, username = Gmail, password = Google App Password (default Firebase sender lands in spam — SMTP makes it arrive)
3. **Authentication → Settings → Authorized domains** → add the Kimi preview URL + the future football domain
4. **Templates → verification** → sender name **"JUM Football"**

## 3. What demo mode covers

- Silent anonymous session on first launch (guests keep coins/follows/likes)
- Signup links the anonymous session so local progress carries over
- Verification screen with 60s resend cooldown, max 3 resends/hour
- Demo-only "Simulate verified email" button on the verify screen

Once real keys are in, the demo button disappears and verification is confirmed by
clicking the emailed link, then "I've verified — check status".

## 4. Firestore (live chat)

1. **Firestore Database → Create database** → production mode
2. **Rules** → publish the rules below (chat + presence + per-user data):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // live chat — anyone signed in can read/write, max 280 chars
    match /matches/{matchId}/comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.text is string
        && request.resource.data.text.size() <= 280;
      allow update: if request.auth != null;
      allow delete: if false;
    }
    match /matches/{matchId}/reported/{reportId} {
      allow create: if request.auth != null;
      allow read, update, delete: if false;
    }
    // viewer presence — counts only, no identities exposed
    match /matchWatchers/{matchId} {
      allow read: if true;
      allow write: if request.auth != null;
      match /online/{uid} {
        allow read: if false;               // counts only — never viewer lists
        allow write: if request.auth != null
          && request.resource.data.uid == request.auth.uid;
      }
    }
    // NOTE: presence cleanup uses a heartbeat + the in-process sweeper
    // (Firestore has no onDisconnect — that's a Realtime Database
    // primitive). The service account recomputes counters every 120s.
    // per-user data (tokens, follows, notification prefs)
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid;
      match /{sub=**} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

The server-side fan-out reads `users/{uid}` via the service account (bypasses rules).
Free tier: 50k reads/day — chat + presence + follows stay well inside it.

## 5. Push notifications (FCM web push) — REQUIRED for goal alerts

1. **Cloud Messaging → Web Push certificates** → **Generate key pair** →
   paste the public key as `NEXT_PUBLIC_FB_FOOTBALL_VAPID_KEY=...`
2. **Project settings → Service accounts** → Generate new private key →
   put the JSON in `FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}`
   (one line). This alone enables everything: the fan-out sends via the
   **FCM v1 API** (`firebase-admin/messaging`) using this credential —
   no legacy Server key is needed on new projects.
3. *(Optional legacy transport)* **Project settings → Cloud Messaging** →
   Server key → `FCM_SERVER_KEY=...` (server-side only). When set, sends use
   the legacy REST endpoint instead of v1.
4. `npm run build` (regenerates `firebase-messaging-sw.js` with the baked config),
   then restart the server — the log line `[notify] goal detector live … [fcm=v1]`
   (or `[fcm=legacy]`) confirms it. Without the service account the triggers fail
   closed with `[notify] push triggers disabled (service account missing)` and the
   app works fully without push.

How it behaves: permission is asked on the first FOLLOW (the tap is the user
gesture); a fallback "Enable goal alerts 🔔" banner lives in the FOLLOW tab; denied
permission shows re-enable instructions instead of nagging. Tokens are stored at
`users/{uid}/tokens/{token}`. The goal detector polls the **cached** `/api/live`
board every 60s — zero extra api-football calls. News digest: max 1/hour, deduped
by link.
