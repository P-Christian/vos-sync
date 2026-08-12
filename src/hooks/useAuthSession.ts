"use client";

import { useState, useEffect } from "react";

export type AuthRole = "employee" | "freelancer" | "employer" | "admin" | "school" | "guest";

export interface AuthSessionState {
  authenticated: boolean;
  role: AuthRole;
  dashboard: string | null;
  userId: number | string | null;
  loading: boolean;
  isJobSeeker: boolean;
  isEmployer: boolean;
  isAdmin: boolean;
  isSchool: boolean;
  isGuest: boolean;
}

const DEFAULT_GUEST_STATE: AuthSessionState = {
  authenticated: false,
  role: "guest",
  dashboard: null,
  userId: null,
  loading: false,
  isJobSeeker: false,
  isEmployer: false,
  isAdmin: false,
  isSchool: false,
  isGuest: true,
};

// In-memory module cache and in-flight promise deduplication
let cachedSession: AuthSessionState | null = null;
let cachedPromise: Promise<AuthSessionState> | null = null;

async function fetchAuthSession(): Promise<AuthSessionState> {
  if (cachedSession) return cachedSession;
  if (cachedPromise) return cachedPromise;

  cachedPromise = (async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          const rawRole = (data.role || "").toLowerCase();
          const role: AuthRole =
            rawRole === "employee" || rawRole === "freelancer"
              ? "freelancer"
              : rawRole === "employer" || rawRole === "client"
              ? "employer"
              : rawRole === "admin"
              ? "admin"
              : rawRole === "school"
              ? "school"
              : "guest";

          cachedSession = {
            authenticated: true,
            role,
            dashboard: data.dashboard || null,
            userId: data.userId || null,
            loading: false,
            isJobSeeker: role === "freelancer",
            isEmployer: role === "employer",
            isAdmin: role === "admin",
            isSchool: role === "school",
            isGuest: false,
          };
          return cachedSession;
        }
      }
    } catch {
      // Fallback to guest on error
    }

    cachedSession = DEFAULT_GUEST_STATE;
    return cachedSession;
  })().finally(() => {
    cachedPromise = null;
  });

  return cachedPromise;
}

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(() => {
    return cachedSession ? cachedSession : { ...DEFAULT_GUEST_STATE, loading: true };
  });

  useEffect(() => {
    let isMounted = true;

    if (!cachedSession) {
      fetchAuthSession().then((session) => {
        if (isMounted) {
          setState(session);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
