/* eslint-disable react-hooks/set-state-in-effect */
// src/modules/job-browse/hooks/useJobBrowse.ts
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PublicJobPosting, JobType, WorkArrangement, ExperienceLevel } from "../types";

const INITIAL_JOB_LIMIT = 12;
const JOB_BATCH_SIZE = 12;

export function useJobBrowse() {
  const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Keep track of current jobs count in ref for fetch pagination
  const jobsCountRef = useRef(0);
  useEffect(() => {
    jobsCountRef.current = jobs.length;
  }, [jobs.length]);

  const fetchApplications = useCallback(async () => {
    try {
      const appsRes = await fetch("/api/freelancer/applications");
      if (appsRes.ok) {
        const appsJson = await appsRes.json();
        const apps = appsJson.applications ?? [];
        const ids = apps
          .filter((app: { application_status?: string }) => app.application_status !== "HIRED" && app.application_status !== "REJECTED")
          .map((app: { job_id: number }) => Number(app.job_id));
        setAppliedJobIds(ids);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchJobs = useCallback(async (isReset = true) => {
    if (isReset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError("");

    const offset = isReset ? 0 : jobsCountRef.current;
    const limit = isReset ? INITIAL_JOB_LIMIT : JOB_BATCH_SIZE;

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (filterJobType !== "ALL") params.set("job_type", filterJobType);
    if (filterArrangement !== "ALL") params.set("work_arrangement", filterArrangement);
    if (filterExperience !== "ALL") params.set("experience_level", filterExperience);

    console.log(
      `%c[JobBrowse] ${isReset ? "🔄 Initial/Filter Fetch" : "📥 Load More Fetch"}`,
      "color: #10b981; font-weight: bold;",
      {
        type: isReset ? "RESET" : "APPEND",
        offset,
        limit,
        currentLoaded: jobsCountRef.current,
        search: debouncedSearch,
        filterJobType,
        filterArrangement,
        filterExperience,
      }
    );

    try {
      const startTime = Date.now();
      const res = await fetch(`/api/freelancer/jobs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load jobs.");

      if (isReset) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 200) {
          await new Promise((r) => setTimeout(r, 200 - elapsed));
        }
        setJobs(json.jobs ?? []);
      } else {
        setJobs((prev) => {
          const existingIds = new Set(prev.map((j) => j.job_id));
          const newJobs = (json.jobs ?? []).filter((j: PublicJobPosting) => !existingIds.has(j.job_id));
          return [...prev, ...newJobs];
        });
      }

      const total = json.total ?? json.jobs?.length ?? 0;
      const filterCount = json.filterCount ?? json.jobs?.length ?? 0;
      const nextHasMore = Boolean(json.hasMore);

      setTotalCount(total);
      setFilteredCount(filterCount);
      setHasMore(nextHasMore);

      console.log(
        `%c[JobBrowse] ✅ Fetch Succeeded`,
        "color: #3b82f6; font-weight: bold;",
        {
          batchFetched: json.jobs?.length ?? 0,
          totalInDb: total,
          matchingFilter: filterCount,
          hasMore: nextHasMore,
          newTotalCount: isReset ? (json.jobs?.length ?? 0) : jobsCountRef.current + (json.jobs?.length ?? 0),
        }
      );
    } catch (err: unknown) {
      console.error("[JobBrowse] ❌ Fetch Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      if (isReset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [debouncedSearch, filterJobType, filterArrangement, filterExperience]);

  // Initial & filter change fetch
  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  // Load more trigger
  const loadMore = useCallback(() => {
    if (loading || loadingMore) {
      console.log("[JobBrowse] ⏳ loadMore skipped: already loading");
      return;
    }
    if (!hasMore) {
      console.log("[JobBrowse] 🏁 loadMore skipped: no more jobs remaining in DB");
      return;
    }
    console.log("[JobBrowse] 🚀 Triggering loadMore...");
    fetchJobs(false);
  }, [fetchJobs, loading, loadingMore, hasMore]);

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
    totalCount,
    filteredCount,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    error,
    appliedJobIds,
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
    fetchApplications,
    openDetail,
    closeDetail,
    openApply,
    closeApply,
  };
}
