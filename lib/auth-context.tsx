"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  watchAuth,
  ensureAnonymousSession,
  type JumUser,
} from "./firebase";

type AuthCtx = {
  user: JumUser | null;
  ready: boolean;
  refresh: () => void;
};

const Ctx = createContext<AuthCtx>({ user: null, ready: false, refresh: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JumUser | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    ensureAnonymousSession()
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        const un = watchAuth((u) => {
          setUser(u);
          setReady(true);
        });
        return () => un();
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return <Ctx.Provider value={{ user, ready, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
