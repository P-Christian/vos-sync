// src/modules/job-browse/JobBrowseModule.tsx
"use client";

import React, { useEffect } from "react";
import { Search, AlertCircle, Briefcase } from "lucide-react";
import { useJobBrowse } from "./hooks/useJobBrowse";
import { JobBrowseFilters } from "./components/JobBrowseFilters";
import { JobBrowseCard } from "./components/JobBrowseCard";
import { JobDetailSheet } from "./components/JobDetailSheet";
import { ApplyModal } from "./components/ApplyModal";

export default function JobBrowseModule() {
  const {
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
  } = useJobBrowse();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .job-browse-page {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="job-browse-page space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              Find Work
            </h1>
            <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
              {allJobs.length} active job{allJobs.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filters */}
        <JobBrowseFilters
          search={search}
          onSearchChange={setSearch}
          filterJobType={filterJobType}
          onJobTypeChange={setFilterJobType}
          filterArrangement={filterArrangement}
          onArrangementChange={setFilterArrangement}
          filterExperience={filterExperience}
          onExperienceChange={setFilterExperience}
          totalCount={allJobs.length}
          filteredCount={jobs.length}
        />

        {/* Job Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-zinc-400 animate-pulse">Loading jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="p-4 bg-muted/40 rounded-2xl">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No jobs found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your filters or search terms
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobBrowseCard key={job.job_id} job={job} onViewDetail={openDetail} />
            ))}
          </div>
        )}
      </div>

      {/* Job Detail Sheet */}
      <JobDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onClose={closeDetail}
        onApply={openApply}
        appliedJobIds={appliedJobIds}
      />

      {/* Apply Modal */}
      <ApplyModal
        job={selectedJob}
        open={applyModalOpen}
        onClose={closeApply}
        onSuccess={fetchJobs}
      />
    </div>
  );
}
