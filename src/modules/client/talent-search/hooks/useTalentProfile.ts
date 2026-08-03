"use client";

// src/modules/client/talent-search/hooks/useTalentProfile.ts

import { useCallback, useState } from "react";
import { TalentProfile } from "../types";

export function useTalentProfile() {
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async (userId: number) => {
    setLoading(true);
    setError("");
    setProfile(null);

    try {
      const res = await fetch(`/api/client/talent-profile/${userId}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load profile.");
      }

      setProfile(json.profile ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError("");
  }, []);

  return { profile, loading, error, fetchProfile, clearProfile };
}
