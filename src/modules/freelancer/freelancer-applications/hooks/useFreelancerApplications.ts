// src/modules/freelancer/freelancer-applications/hooks/useFreelancerApplications.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { ApplicationItem, ApplicationStatus, ApplicationSummary } from "../types";

export function useFreelancerApplications() {
  const [allApplications, setAllApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/freelancer/applications");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load applications.");
      setAllApplications(json.applications ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Computed summary KPIs
  const summary: ApplicationSummary = useMemo(() => {
    const total = allApplications.length;
    const interviewing = allApplications.filter(
      (a) => a.application_status === "INTERVIEW_SCHEDULED"
    ).length;
    const hired = allApplications.filter((a) => a.application_status === "HIRED").length;
    const successRate = total > 0 ? Math.round((hired / total) * 100) : 0;

    return {
      totalApplied: total,
      interviewing,
      activeOffers: hired,
      successRate,
    };
  }, [allApplications]);

  // Client-side filtered list
  const applications = useMemo(() => {
    return allApplications.filter((a) => {
      const matchesStatus =
        filterStatus === "ALL" || a.application_status === filterStatus;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (a.job_title ?? "").toLowerCase().includes(q) ||
        (a.company_name ?? "").toLowerCase().includes(q) ||
        (a.job_location ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allApplications, filterStatus, search]);

  return {
    applications,
    summary,
    loading,
    error,
    filterStatus,
    setFilterStatus,
    search,
    setSearch,
    fetchApplications,
  };
}
