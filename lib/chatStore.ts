"use client";

// JUM Football — real-time match chat.
// Firestore: matches/{matchId}/comments = { uid, name, text, likes[], replies[],
// reactions{}, createdAt } · reports → reported/{autoId}.
// onSnapshot delivers remote changes ~1s. Demo mode (no Firebase keys) falls
// back to a localStorage-backed echo store so the UI is fully testable.
// Guards (280 chars, 1 comment / 5s per uid, latest 200 + load earlier,
// listener detaches while tab hidden) live in the component; Firestore
// security rules that mirror them are documented in README.md.

import { isDemoMode, getFirestoreDb } from "./firebase";

export type ChatReply = {
  uid: string;
  name: string;
  text: string;
  createdAt: number; // epoch ms
};

export type ChatMsg = {
  id: string;
  uid: string;
  name: string;
  text: string;
  likes: string[]; // uids
  replies: ChatReply[];
  reactions: Record<string, string[]>; // emoji → uids
  createdAt: number; // epoch ms
  own?: boolean;
};

export const MAX_CHAT_CHARS = 280;
export const CHAT_THROTTLE_MS = 5000;
export const CHAT_PAGE_SIZE = 200;

/* ═══════════ demo-mode echo store (same API shape) ═══════════ */

type DemoListener = (items: ChatMsg[]) => void;
const demoListeners = new Map<string, Set<DemoListener>>();
let demoSeq = 0;

function demoKey(matchId: string | number) {
  return `jum-chat-demo-${matchId}`;
}
function readDemo(matchId: string | number): ChatMsg[] {
  try {
    return JSON.parse(localStorage.getItem(demoKey(matchId)) ?? "[]") as ChatMsg[];
  } catch {
    return [];
  }
}
function writeDemo(matchId: string | number, items: ChatMsg[]) {
  localStorage.setItem(demoKey(matchId), JSON.stringify(items.slice(0, 500)));
  const set = demoListeners.get(String(matchId));
  set?.forEach((cb) => cb(items));
  // cross-tab echo (two browsers on one machine see each other)
  window.dispatchEvent(new Event("jum-chat-demo-change"));
}

function demoSubscribe(matchId: string | number, cb: DemoListener): () => void {
  const key = String(matchId);
  if (!demoListeners.has(key)) demoListeners.set(key, new Set());
  demoListeners.get(key)!.add(cb);
  const onStorage = () => cb(readDemo(matchId));
  window.addEventListener("storage", onStorage);
  window.addEventListener("jum-chat-demo-change", onStorage);
  cb(readDemo(matchId));
  return () => {
    demoListeners.get(key)?.delete(cb);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("jum-chat-demo-change", onStorage);
  };
}

/* ═══════════ public API ═══════════ */

/**
 * Real-time subscription: latest CHAT_PAGE_SIZE comments, ascending by time.
 * The caller detaches the returned unsubscribe when the tab hides.
 */
export async function subscribeChat(
  matchId: string | number,
  cb: (items: ChatMsg[]) => void
): Promise<() => void> {
  const id = String(matchId);
  if (isDemoMode()) return demoSubscribe(id, cb);

  const db = await getFirestoreDb();
  if (!db) return demoSubscribe(id, cb);
  const {
    collection, query, orderBy, limit, onSnapshot,
  } = await import("firebase/firestore");
  const q = query(collection(db, "matches", id, "comments"), orderBy("createdAt", "desc"), limit(CHAT_PAGE_SIZE));
  return onSnapshot(q, (snap) => {
    const items: ChatMsg[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as Omit<ChatMsg, "id" | "createdAt"> & { createdAt?: unknown };
      items.push({
        ...d,
        id: doc.id,
        likes: d.likes ?? [],
        replies: d.replies ?? [],
        reactions: d.reactions ?? {},
        createdAt: toMs(d.createdAt),
      });
    });
    cb(items.reverse()); // oldest first
  });
}

/** Older pages for "Load earlier". Returns the previous page or empty. */
export async function loadEarlierChat(matchId: string | number, oldestMs: number): Promise<ChatMsg[]> {
  const id = String(matchId);
  if (isDemoMode()) {
    return readDemo(id).filter((m) => m.createdAt < oldestMs).slice(-CHAT_PAGE_SIZE);
  }
  const db = await getFirestoreDb();
  if (!db) return [];
  const {
    collection, query, orderBy, endBefore, limitToLast, getDocs,
  } = await import("firebase/firestore");
  const q = query(
    collection(db, "matches", id, "comments"),
    orderBy("createdAt", "asc"),
    endBefore(oldestMs as never),
    limitToLast(CHAT_PAGE_SIZE)
  );
  const snap = await getDocs(q);
  const items: ChatMsg[] = [];
  snap.forEach((doc) => {
    const d = doc.data() as Omit<ChatMsg, "id" | "createdAt"> & { createdAt?: unknown };
    items.push({ ...d, id: doc.id, createdAt: toMs(d.createdAt) });
  });
  return items;
}

export async function sendChatComment(matchId: string | number, uid: string, name: string, text: string) {
  const id = String(matchId);
  const msg: ChatMsg = {
    id: `c${Date.now().toString(36)}${demoSeq++}`,
    uid, name, text, likes: [], replies: [], reactions: {}, createdAt: Date.now(), own: true,
  };
  if (isDemoMode() || !(await getFirestoreDb())) {
    writeDemo(id, [...readDemo(id), msg]);
    return;
  }
  const db = (await getFirestoreDb())!;
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  await addDoc(collection(db, "matches", id, "comments"), {
    uid, name, text, likes: [], replies: [], reactions: {}, createdAt: serverTimestamp(),
  });
}

export async function sendChatReply(matchId: string | number, commentId: string, uid: string, name: string, text: string) {
  const id = String(matchId);
  const reply: ChatReply = { uid, name, text, createdAt: Date.now() };
  if (isDemoMode() || !(await getFirestoreDb())) {
    writeDemo(id, readDemo(id).map((m) => (m.id === commentId ? { ...m, replies: [...m.replies, reply] } : m)));
    return;
  }
  const db = (await getFirestoreDb())!;
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  await updateDoc(doc(db, "matches", id, "comments", commentId), { replies: arrayUnion(reply) });
}

/** Like/unlike — one per uid, enforced here and by arrayUnion/Remove. */
export async function toggleChatLike(matchId: string | number, commentId: string, uid: string, liked: boolean) {
  const id = String(matchId);
  if (isDemoMode() || !(await getFirestoreDb())) {
    writeDemo(id, readDemo(id).map((m) =>
      m.id === commentId
        ? { ...m, likes: liked ? m.likes.filter((u) => u !== uid) : [...m.likes, uid] }
        : m
    ));
    return;
  }
  const db = (await getFirestoreDb())!;
  const { doc, updateDoc, arrayUnion, arrayRemove } = await import("firebase/firestore");
  await updateDoc(doc(db, "matches", id, "comments", commentId), {
    likes: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function addChatReaction(matchId: string | number, commentId: string, uid: string, emoji: string) {
  const id = String(matchId);
  if (isDemoMode() || !(await getFirestoreDb())) {
    writeDemo(id, readDemo(id).map((m) => {
      if (m.id !== commentId) return m;
      const cur = m.reactions[emoji] ?? [];
      const next = cur.includes(uid) ? cur.filter((u) => u !== uid) : [...cur, uid];
      return { ...m, reactions: { ...m.reactions, [emoji]: next } };
    }));
    return;
  }
  const db = (await getFirestoreDb())!;
  const { doc, updateDoc, arrayUnion, arrayRemove } = await import("firebase/firestore");
  const ref = doc(db, "matches", id, "comments", commentId);
  const cur = (await import("firebase/firestore")).getDoc(ref);
  const d = (await cur).data() as ChatMsg | undefined;
  const uids = d?.reactions?.[emoji] ?? [];
  await updateDoc(ref, {
    [`reactions.${emoji}`]: uids.includes(uid) ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function reportChatComment(matchId: string | number, comment: ChatMsg, reporterUid: string) {
  const id = String(matchId);
  if (isDemoMode() || !(await getFirestoreDb())) {
    const key = "jum-chat-reports";
    const cur = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
    cur.push({ commentId: comment.id, matchId: id, uid: reporterUid, text: comment.text, at: Date.now() });
    localStorage.setItem(key, JSON.stringify(cur));
    return;
  }
  const db = (await getFirestoreDb())!;
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  await addDoc(collection(db, "reported"), {
    commentId: comment.id,
    matchId: id,
    authorUid: comment.uid,
    text: comment.text,
    reporterUid,
    createdAt: serverTimestamp(),
  });
}

function toMs(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toMillis" in (v as { toMillis?: unknown })) {
    return (v as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}
