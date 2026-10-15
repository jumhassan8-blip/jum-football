"use client";

// ── Web push (FCM) — client side ─────────────────────────────
// Fail-closed everywhere: unsupported browser, denied permission,
// missing VAPID key or unreachable Firestore → push is simply absent
// and the app remains fully usable.

import { isDemoMode, getFirestoreDb } from "./firebase";
import { publicEnv } from "./env";

export type PushState = "unsupported" | "default" | "granted" | "denied";

export function getPushState(): PushState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  const p = Notification.permission;
  if (p === "granted") return "granted";
  if (p === "denied") return "denied";
  return "default";
}

/** FCM web push needs IndexedDB + SW support — iOS Safari < 16.4 etc. fall out here. */
async function messagingSupported(): Promise<boolean> {
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Ask for permission (MUST be called from a user gesture) and, when
 * granted, register the SW + store the FCM token under
 * users/{uid}/tokens/{token}. Returns the resulting state.
 */
export async function requestPushAndStoreToken(uid: string | null): Promise<PushState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (isDemoMode()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (!(await messagingSupported())) return "unsupported";

  const vapidKey = publicEnv.firebase.vapidKey;
  if (!vapidKey) {
    console.warn("[push] NEXT_PUBLIC_FB_FOOTBALL_VAPID_KEY missing — push disabled");
    return "unsupported";
  }

  try {
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return perm === "denied" ? "denied" : "default";
  } catch {
    return "default";
  }

  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return "default";

    if (uid) {
      const db = await getFirestoreDb();
      if (db) {
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        await setDoc(doc(db, "users", uid, "tokens", token), {
          platform: "web",
          createdAt: serverTimestamp(),
        });
      }
    }
    return "granted";
  } catch (e) {
    console.warn("[push] token registration failed:", String(e).slice(0, 120));
    return "default";
  }
}
