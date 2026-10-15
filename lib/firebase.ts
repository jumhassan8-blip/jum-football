// JUM FOOTBALL — Firebase Auth (separate from the eSIM project).
// Wire real keys via NEXT_PUBLIC_FB_FOOTBALL_* env vars.
// See FIREBASE_SETUP.md for the console checklist (email delivery depends on it).

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { publicEnv } from "./env";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";

export type JumUser = {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  emailVerified: boolean;
};

const cfg = {
  apiKey: publicEnv.firebase.apiKey,
  authDomain: publicEnv.firebase.authDomain,
  projectId: publicEnv.firebase.projectId,
  appId: publicEnv.firebase.appId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let demoMode = false;

/** True when Firebase keys are placeholders — auth runs against a local mock. */
export function isDemoMode(): boolean {
  ensureAuth();
  return demoMode;
}

function ensureAuth(): Auth {
  if (auth) return auth;
  app = getApps().length ? getApps()[0] : initializeApp(cfg);
  auth = getAuth(app);
  // Demo mode: keys are placeholders — auth screens run against a local
  // mock so every flow is testable before real keys land.
  demoMode = !publicEnv.firebase.apiKey;
  return auth;
}

function toJumUser(u: User | null): JumUser | null {
  if (!u) return null;
  return { uid: u.uid, email: u.email, isAnonymous: u.isAnonymous, emailVerified: u.emailVerified };
}

/* ── session (silent anonymous on first launch, guests lose nothing) ── */
export function watchAuth(cb: (u: JumUser | null) => void): () => void {
  const a = ensureAuth();
  if (demoMode) {
    const raw = localStorage.getItem("jum-auth-demo");
    cb(raw ? (JSON.parse(raw) as JumUser) : null);
    const sync = () => {
      const r = localStorage.getItem("jum-auth-demo");
      cb(r ? (JSON.parse(r) as JumUser) : null);
    };
    window.addEventListener("jum-auth-change", sync);
    return () => window.removeEventListener("jum-auth-change", sync);
  }
  return onAuthStateChanged(a, (u) => cb(toJumUser(u)));
}

export async function ensureAnonymousSession(): Promise<void> {
  const a = ensureAuth();
  if (demoMode) {
    if (!localStorage.getItem("jum-auth-demo")) {
      const guest: JumUser = {
        uid: `anon-${Math.random().toString(36).slice(2, 10)}`,
        email: null,
        isAnonymous: true,
        emailVerified: false,
      };
      localStorage.setItem("jum-auth-demo", JSON.stringify(guest));
      window.dispatchEvent(new Event("jum-auth-change"));
    }
    return;
  }
  if (!a.currentUser) await signInAnonymously(a);
}

export async function loginEmail(email: string, password: string): Promise<JumUser> {
  const a = ensureAuth();
  if (demoMode) {
    const stored = JSON.parse(localStorage.getItem("jum-auth-demo-account") ?? "null") as {
      email: string;
      password: string;
    } | null;
    if (!stored || stored.email !== email || stored.password !== password)
      throw new Error("auth/wrong-password");
    const u: JumUser = { uid: `local-${email}`, email, isAnonymous: false, emailVerified: true };
    localStorage.setItem("jum-auth-demo", JSON.stringify(u));
    window.dispatchEvent(new Event("jum-auth-change"));
    return u;
  }
  const cred: UserCredential = await signInWithEmailAndPassword(a, email, password);
  return toJumUser(cred.user)!;
}

export async function signupEmail(email: string, password: string): Promise<JumUser> {
  const a = ensureAuth();
  if (demoMode) {
    const u: JumUser = { uid: `local-${email}`, email, isAnonymous: false, emailVerified: false };
    localStorage.setItem("jum-auth-demo-account", JSON.stringify({ email, password }));
    localStorage.setItem("jum-auth-demo", JSON.stringify(u));
    window.dispatchEvent(new Event("jum-auth-change"));
    return u;
  }
  // link the silent anonymous session so favorites/coins carry over
  const cred = a.currentUser?.isAnonymous
    ? await linkWithCredential(a.currentUser, EmailAuthProvider.credential(email, password))
    : await createUserWithEmailAndPassword(a, email, password);
  return toJumUser(cred.user)!;
}

export async function sendVerification(u: JumUser | null): Promise<void> {
  const a = ensureAuth();
  if (demoMode) {
    localStorage.setItem("jum-auth-demo-verify-sent", new Date().toISOString());
    return;
  }
  const cu = a.currentUser;
  if (!cu) throw new Error("auth/no-current-user");
  await sendEmailVerification(cu);
  void u;
}

export async function resetPassword(email: string): Promise<void> {
  const a = ensureAuth();
  if (demoMode) {
    localStorage.setItem("jum-auth-demo-reset", email);
    return;
  }
  await sendPasswordResetEmail(a, email);
}

export async function markVerifiedDemo(): Promise<void> {
  const raw = localStorage.getItem("jum-auth-demo");
  if (!raw) return;
  const u = JSON.parse(raw) as JumUser;
  u.emailVerified = true;
  localStorage.setItem("jum-auth-demo", JSON.stringify(u));
  window.dispatchEvent(new Event("jum-auth-change"));
}

/* ── Firestore (chat) — null in demo mode ── */
export async function getFirestoreDb() {
  if (isDemoMode()) return null;
  const { getFirestore } = await import("firebase/firestore");
  ensureAuth();
  return getFirestore(app!);
}

export async function signOutJum(): Promise<void> {
  const a = ensureAuth();
  if (demoMode) {
    const guest: JumUser = {
      uid: `anon-${Math.random().toString(36).slice(2, 10)}`,
      email: null,
      isAnonymous: true,
      emailVerified: false,
    };
    localStorage.setItem("jum-auth-demo", JSON.stringify(guest));
    window.dispatchEvent(new Event("jum-auth-change"));
    return;
  }
  await signOut(a);
  await signInAnonymously(a); // fresh guest session
}
