// src/modules/job-browse/hooks/useJobBrowse.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { PublicJobPosting, JobType, WorkArrangement, ExperienceLevel } from "../types";

export function useJobBrowse() {
  const [allJobs, setAllJobs] = useState<PublicJobPosting[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter state
  const [search, setSearch] = useState("");
  const [filterJobType, setFilterJobType] = useState<JobType | "ALL">("ALL");
  const [filterArrangement, setFilterArrangement] = useState<WorkArrangement | "ALL">("ALL");
  const [filterExperience, setFilterExperience] = useState<ExperienceLevel | "ALL">("ALL");

  // Detail sheet state
  const [selectedJob, setSelectedJob] = useState<PublicJobPosting | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Apply modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/freelancer/jobs");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load jobs.");
      setAllJobs(json.jobs ?? []);

      const appsRes = await fetch("/api/freelancer/applications");
      if (appsRes.ok) {
        const appsJson = await appsRes.json();
        const apps = appsJson.applications ?? [];
        const ids = apps
          .filter((app: { application_status?: string }) => app.application_status !== "HIRED" && app.application_status !== "REJECTED")
          .map((app: { job_id: number }) => Number(app.job_id));
        setAppliedJobIds(ids);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Client-side filtered jobs
  const jobs = useMemo(() => {
    return allJobs.filter((j) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        j.job_title.toLowerCase().includes(q) ||
        (j.company_name ?? "").toLowerCase().includes(q) ||
        j.job_location.toLowerCase().includes(q) ||
        j.job_category.toLowerCase().includes(q);

      const matchesType = filterJobType === "ALL" || j.job_type === filterJobType;
      const matchesArrangement = filterArrangement === "ALL" || j.work_arrangement === filterArrangement;
      const matchesExperience = filterExperience === "ALL" || j.experience_level === filterExperience;

      return matchesSearch && matchesType && matchesArrangement && matchesExperience;
    });
  }, [allJobs, search, filterJobType, filterArrangement, filterExperience]);

  const openDetail = useCallback((job: PublicJobPosting) => {
    setSelectedJob(job);
    setSheetOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const openApply = useCallback((job: PublicJobPosting) => {
    setSelectedJob(job);
    setSheetOpen(false);
    setApplyModalOpen(true);
  }, []);

  const closeApply = useCallback(() => {
    setApplyModalOpen(false);
  }, []);

  return {
    jobs,
    allJobs,
    appliedJobIds,
    loading,
    error,
    search,
    setSearch,
    filterJobType,
    setFilterJobType,
    filterArrangement,
    setFilterArrangement,
    filterExperience,
    setFilterExperience,
    selectedJob,
    sheetOpen,
    applyModalOpen,
    fetchJobs,
    openDetail,
    closeDetail,
    openApply,
    closeApply,
  };
}
