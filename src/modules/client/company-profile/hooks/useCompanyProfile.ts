// src/modules/client/company-profile/hooks/useCompanyProfile.ts
"use client";

import { useState, useCallback } from "react";
import { CompanyProfile, CompanyProfileMeta, EditableCompanyFields } from "../types";

export function useCompanyProfile() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [meta, setMeta] = useState<CompanyProfileMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/client/company-profile");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load company profile.");
      }
      setCompany(json.company);
      setMeta(json.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (fields: Partial<EditableCompanyFields>) => {
      setSaving(true);
      setError("");
      setSuccessMessage("");
      try {
        const res = await fetch("/api/client/company-profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to save company profile.");
        }
        if (json.company) {
          setCompany((prev) =>
            prev ? { ...prev, ...(json.company as Partial<CompanyProfile>) } : null
          );
        }
        setSuccessMessage("Company profile updated successfully.");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred while saving.");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const createProfile = useCallback(
    async (fields: Partial<EditableCompanyFields>) => {
      setSaving(true);
      setError("");
      setSuccessMessage("");
      try {
        const res = await fetch("/api/client/company-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to create company profile.");
        }
        if (json.company) {
          setCompany(json.company);
          // Re-fetch profile to load updated links/meta
          await fetchProfile();
        }
        setSuccessMessage("Company profile created successfully.");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred while setting up profile.");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [fetchProfile]
  );

  const submitForVerification = useCallback(async () => {
    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/client/company-profile/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit company profile.");
      }
      if (json.company) {
        setCompany((prev) =>
          prev ? { ...prev, ...(json.company as Partial<CompanyProfile>) } : null
        );
      }
      setSuccessMessage("Company profile submitted for verification successfully.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An error occurred while submitting."
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    company,
    meta,
    loading,
    saving,
    submitting,
    error,
    successMessage,
    fetchProfile,
    updateProfile,
    createProfile,
    submitForVerification,
    clearMessages: () => {
      setError("");
      setSuccessMessage("");
    },
  };
}
