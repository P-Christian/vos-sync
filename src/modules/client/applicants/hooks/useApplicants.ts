// src/modules/client/applicants/hooks/useApplicants.ts
"use client";

import { useState, useCallback } from "react";
import { Applicant, ApplicationStatus } from "../types";

export function useApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const fetchApplicants = useCallback(
    async (status?: ApplicationStatus | "ALL") => {
      setLoading(true);
      setError("");
      try {
        const q = status && status !== "ALL" ? `?status=${status}` : "";
        const res = await fetch(`/api/client/applicants${q}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load applicants.");
        setApplicants(json.applicants ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (applicationId: number, status: ApplicationStatus, notes: string) => {
      setSaving(true);
      setError("");
      try {
        const res = await fetch(`/api/client/applicants/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ application_status: status, client_notes: notes }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update status.");
        setApplicants((prev) =>
          prev.map((a) =>
            a.application_id === applicationId
              ? { ...a, application_status: status, client_notes: notes }
              : a
          )
        );
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

  const filteredApplicants = applicants.filter((a) => {
    const matchesStatus =
      filterStatus === "ALL" || a.application_status === filterStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (a.applicant_name ?? "").toLowerCase().includes(q) ||
      (a.applicant_email ?? "").toLowerCase().includes(q) ||
      (a.job_title ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return {
    applicants: filteredApplicants,
    loading,
    saving,
    error,
    filterStatus,
    setFilterStatus,
    search,
    setSearch,
    fetchApplicants,
    updateStatus,
    clearError: () => setError(""),
  };
}

