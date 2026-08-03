"use client";

// src/modules/client/talent-search/hooks/useSavedTalent.ts

import { useCallback, useState } from "react";
import { SavedTalent } from "../types";

export function useSavedTalent() {
  const [saved, setSaved] = useState<SavedTalent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/client/saved-talent");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load saved talent.");
      }

      setSaved(json.saved ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTalent = useCallback(
    async (
      talentUserId: number,
      notes?: string,
      folderName?: string
    ): Promise<boolean> => {
      setSaving(true);
      setError("");

      try {
        const res = await fetch("/api/client/saved-talent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            talent_user_id: talentUserId,
            notes: notes || null,
            folder_name: folderName || "Default",
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          if (res.status === 409) return true; // Already saved
          throw new Error(json.error || "Failed to save talent.");
        }

        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const unsaveTalent = useCallback(async (talentUserId: number): Promise<boolean> => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/client/saved-talent/${talentUserId}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || "Failed to remove saved talent.");
      }

      setSaved((prev) => prev.filter((s) => s.talent_user_id !== talentUserId));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const sendInvitation = useCallback(
    async (talentUserId: number, message: string, jobId?: number): Promise<boolean> => {
      setSaving(true);
      setError("");

      try {
        const res = await fetch("/api/client/talent-invitation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            talent_user_id: talentUserId,
            message,
            job_id: jobId || null,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to send invitation.");
        }

        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    saved,
    loading,
    saving,
    error,
    fetchSaved,
    saveTalent,
    unsaveTalent,
    sendInvitation,
    clearError: () => setError(""),
  };
}
