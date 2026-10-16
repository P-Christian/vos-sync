// src/modules/freelancer/freelancer-applications/hooks/useFreelancerApplications.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ApplicationAssessmentInfo,
  ApplicationItem,
  ApplicationSummary,
} from "../types";
import type { ApplicationAssessmentSummary } from "../types/assessment";
import type { AttemptStatus } from "@/modules/shared/assessment";
import { fetchAssessmentSummaries } from "../services/assessment-client";
import type { DateRangeFilterValue } from "../components/application-table/DateRangeFilter";

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

/**
 * Helper to format raw status enum or stage identifier into user-friendly title case.
 * e.g., "UNDER_REVIEW" -> "Under Review", "SHORTLISTED" -> "Shortlisted"
 */
function formatStatusLabel(val: string): string {
  return val
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function useFreelancerApplications() {
  const [allApplications, setAllApplications] = useState<ApplicationItem[]>([]);
  const [assessmentSummaries, setAssessmentSummaries] = useState<
    Record<number, ApplicationAssessmentSummary>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<DateRangeFilterValue>({ preset: "ALL" });
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

  // Dynamically derive filter status options from actual application data.
  // No hardcoded constant status list.
  const statusOptions = useMemo(() => {
    const optionsMap = new Map<string, string>();
    optionsMap.set("ALL", "All Statuses");

    for (const app of allApplications) {
      // 1. Current dynamic stage name if configured
      if (app.current_stage?.stage_name) {
        optionsMap.set(app.current_stage.stage_name, app.current_stage.stage_name);
      }
      // 2. Canonical application status (e.g. WITHDRAWN, APPLIED, SHORTLISTED, etc.)
      if (app.application_status) {
        const key = app.application_status;
        if (!optionsMap.has(key)) {
          optionsMap.set(key, formatStatusLabel(key));
        }
      }
    }

    return Array.from(optionsMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [allApplications]);

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

  // Client-side filtered list with date range and dynamic status filtering
  const applications = useMemo(() => {
    const now = new Date();

    return allApplications
      .filter((a) => {
        // Status matching: match canonical status or stage name
        const matchesStatus =
          filterStatus === "ALL" ||
          a.application_status === filterStatus ||
          a.current_stage?.stage_name === filterStatus;

        // Search matching
        const q = search.toLowerCase();
        const matchesSearch =
          !q ||
          (a.job_title ?? "").toLowerCase().includes(q) ||
          (a.company_name ?? "").toLowerCase().includes(q) ||
          (a.job_location ?? "").toLowerCase().includes(q);

        // Date range matching
        let matchesDate = true;
        if (dateFilter.preset !== "ALL" && a.applied_at) {
          const appliedDate = new Date(a.applied_at);
          if (dateFilter.preset === "7_DAYS") {
            const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = appliedDate >= cutoff;
          } else if (dateFilter.preset === "30_DAYS") {
            const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = appliedDate >= cutoff;
          } else if (dateFilter.preset === "90_DAYS") {
            const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            matchesDate = appliedDate >= cutoff;
          } else if (dateFilter.preset === "CUSTOM") {
            if (dateFilter.startDate) {
              const start = new Date(dateFilter.startDate);
              start.setHours(0, 0, 0, 0);
              if (appliedDate < start) matchesDate = false;
            }
            if (dateFilter.endDate && matchesDate) {
              const end = new Date(dateFilter.endDate);
              end.setHours(23, 59, 59, 999);
              if (appliedDate > end) matchesDate = false;
            }
          }
        }

        return matchesStatus && matchesSearch && matchesDate;
      })
      .map((application) => ({
        ...application,
        assessment: toAssessmentInfo(assessmentSummaries[application.application_id]),
      }));
  }, [allApplications, filterStatus, search, dateFilter, assessmentSummaries]);

  return {
    applications,
    allApplications,
    summary,
    loading,
    error,
    filterStatus,
    setFilterStatus,
    dateFilter,
    setDateFilter,
    statusOptions,
    search,
    setSearch,
    fetchApplications,
  };
}
