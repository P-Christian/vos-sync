"use client";

// src/modules/client/settings/hooks/useSettings.ts

import { useCallback, useState } from "react";
import { UserProfile, SecurityPayload, TeamMember } from "../types";
import {
  fetchUserProfile,
  updateUserProfile,
  updateUserPassword,
  fetchTeamMembers,
  updateTeamMemberRole,
} from "../providers/SettingsProvider";

export function useSettings() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);

  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUserProfile();
      setUser(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (data: Partial<UserProfile>) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const updated = await updateUserProfile(data);
      setUser(updated);
      setSuccessMessage("Profile updated successfully.");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const changePassword = useCallback(async (payload: SecurityPayload) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await updateUserPassword(payload);
      setSuccessMessage("Password changed successfully.");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    setError("");
    try {
      const members = await fetchTeamMembers();
      setTeam(members);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load team members.");
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const modifyTeamRole = useCallback(
    async (
      companyUserId: number,
      role: "OWNER" | "ADMIN" | "MEMBER",
      status?: "ACTIVE" | "INACTIVE"
    ) => {
      setSaving(true);
      setError("");
      setSuccessMessage("");
      try {
        await updateTeamMemberRole(companyUserId, role, status);
        setTeam((prev) =>
          prev.map((m) =>
            m.company_user_id === companyUserId
              ? { ...m, company_user_role: role, status: status ?? m.status }
              : m
          )
        );
        setSuccessMessage("Team member role updated successfully.");
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update team role.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    user,
    team,

    loading,
    teamLoading,
    saving,

    error,
    successMessage,

    loadProfile,
    saveProfile,
    changePassword,
    loadTeam,
    modifyTeamRole,

    clearMessages: () => {
      setError("");
      setSuccessMessage("");
    },
  };
}
