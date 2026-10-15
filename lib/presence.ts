"use client";

// ── Live viewer presence (Firestore) ──────────────────────────
// matchWatchers/{matchId}/online/{uid} — heartbeat doc written on
// watch-screen open and refreshed every 60s while watching. Firestore
// has no onDisconnect (that's a Realtime-Database primitive), so
// server-side cleanup equivalent lives in the dev-server process: a
// presence sweeper reaps docs whose heartbeat is older than 150s and
// recomputes the aggregate counter — survives crashes/tabs closed,
// zero new infra. A lightweight counter doc (matchWatchers/{matchId}
// .count) updates in the same commit, so /live cards read one tiny
// doc instead of fanning out per-listener.
// Privacy: counts only — no viewer lists are ever exposed.

import { useEffect, useState } from "react";
import { isDemoMode, getFirestoreDb } from "./firebase";

const HEARTBEAT_MS = 60_000;

/** Join presence for a match. Returns a leave() — idempotent, safe to call twice. */
export async function joinPresence(matchId: string | number, uid: string): Promise<() => Promise<void>> {
  const noop = async () => {};
  if (!uid || isDemoMode()) return noop;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  try {
    const db = await getFirestoreDb();
    if (!db) return noop;
    const { doc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } =
      await import("firebase/firestore");
    const id = String(matchId);
    const me = doc(db, "matchWatchers", id, "online", uid);
    const agg = doc(db, "matchWatchers", id);

    const beat = () => {
      void setDoc(me, { uid, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };
    // first beat also plants joinedAt
    void setDoc(me, { uid, joinedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    beat();
    await setDoc(agg, { count: increment(1), updatedAt: serverTimestamp() }, { merge: true });
    heartbeat = setInterval(beat, HEARTBEAT_MS);

    let left = false;
    return async () => {
      if (left) return;
      left = true;
      if (heartbeat) clearInterval(heartbeat);
      try {
        await deleteDoc(me);
        await updateDoc(agg, { count: increment(-1) }).catch(() => {});
      } catch {
        /* gone already — server sweeper covers it */
      }
    };
  } catch {
    if (heartbeat) clearInterval(heartbeat);
    return noop;
  }
}

/** Live viewer count for one match (0 when unavailable — fail-closed). */
export function useViewerCount(matchId: string | number | null): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (matchId == null || isDemoMode()) {
      setCount(0);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const db = await getFirestoreDb();
      if (!db || cancelled) return;
      const { doc, onSnapshot } = await import("firebase/firestore");
      unsub = onSnapshot(doc(db, "matchWatchers", String(matchId)), (snap) => {
        if (cancelled) return;
        const n = (snap.data()?.count as number | undefined) ?? 0;
        setCount(Math.max(0, n));
      });
    })();
    return () => { cancelled = true; unsub?.(); };
  }, [matchId]);
  return count;
}

/** Live viewer counts for many matches at once (aggregate docs only). */
export function useViewerCounts(ids: (string | number)[]): Record<string, number> {
  const key = ids.map(String).sort().join(",");
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (list.length === 0 || isDemoMode()) {
      setCounts({});
      return;
    }
    const next: Record<string, number> = {};
    const unsubs: (() => void)[] = [];
    let cancelled = false;
    void (async () => {
      const db = await getFirestoreDb();
      if (!db || cancelled) return;
      const { doc, onSnapshot } = await import("firebase/firestore");
      for (const id of list) {
        unsubs.push(
          onSnapshot(doc(db, "matchWatchers", id), (snap) => {
            if (cancelled) return;
            next[id] = Math.max(0, (snap.data()?.count as number | undefined) ?? 0);
            setCounts({ ...next });
          })
        );
      }
    })();
    return () => { cancelled = true; unsubs.forEach((u) => u()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return counts;
}
