// src/modules/freelancer/freelancer-applications/hooks/useFreelancerApplications.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ApplicationAssessmentInfo,
  ApplicationItem,
  ApplicationStatus,
  ApplicationSummary,
} from "../types";
import type { ApplicationAssessmentSummary } from "../types/assessment";
import type { AttemptStatus } from "@/modules/shared/assessment";
import { fetchAssessmentSummaries } from "../services/assessment-client";

/**
 * Assessment stages persist the canonical UNDER_REVIEW legacy status, so only
 * these rows can carry frozen assessment tasks; probing others would waste a
 * request per row.
 */
function assessmentCandidates(applications: ApplicationItem[]): number[] {
  return applications
    .filter((application) => application.application_status === "UNDER_REVIEW")
    .map((application) => application.application_id);
}

/** Latest-attempt statuses that still require the freelancer to act. */
const ACTION_REQUIRED_STATUSES: readonly AttemptStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "NEEDS_REVISION",
];

/**
 * Normalizes the read-only probe result into the shape every row exposes.
 * A stage without frozen tasks reports `available: false` and no status, so
 * the "Assessment due" indicator can never fire on a non-assessment row.
 */
function toAssessmentInfo(
  summary: ApplicationAssessmentSummary | undefined,
): ApplicationAssessmentInfo | null {
  if (!summary) return null;
  return {
    available: summary.available,
    status: summary.available ? summary.status : null,
    needs_action: summary.available && ACTION_REQUIRED_STATUSES.includes(summary.status),
    deadline: summary.deadline ?? null,
  };
}

export function useFreelancerApplications() {
  const [allApplications, setAllApplications] = useState<ApplicationItem[]>([]);
  const [assessmentSummaries, setAssessmentSummaries] = useState<
    Record<number, ApplicationAssessmentSummary>
  >({});
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
      const loaded: ApplicationItem[] = json.applications ?? [];
      setAllApplications(loaded);
      const candidates = assessmentCandidates(loaded);
      setAssessmentSummaries(
        candidates.length > 0 ? await fetchAssessmentSummaries(candidates) : {},
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Computed summary KPIs
  const summary: ApplicationSummary = useMemo(() => {
    const total = allApplications.length;
    const terminalOrDraftStatuses = ["DRAFT", "HIRED", "REJECTED", "WITHDRAWN", "CANCELLED_CLOSED"];
    const pendingApplications = allApplications.filter(
      (a) => !terminalOrDraftStatuses.includes(a.application_status)
    ).length;
    const hired = allApplications.filter((a) => a.application_status === "HIRED").length;
    const successRate = total > 0 ? Math.round((hired / total) * 100) : 0;

    return {
      totalApplied: total,
      pendingApplications,
      activeOffers: hired,
      successRate,
    };
  }, [allApplications]);

  // Client-side filtered list
  const applications = useMemo(() => {
    return allApplications
      .filter((a) => {
        const matchesStatus =
          filterStatus === "ALL" || a.application_status === filterStatus;
        const q = search.toLowerCase();
        const matchesSearch =
          !q ||
          (a.job_title ?? "").toLowerCase().includes(q) ||
          (a.company_name ?? "").toLowerCase().includes(q) ||
          (a.job_location ?? "").toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .map((application) => ({
        ...application,
        assessment: toAssessmentInfo(assessmentSummaries[application.application_id]),
      }));
  }, [allApplications, filterStatus, search, assessmentSummaries]);

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
