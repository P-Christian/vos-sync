"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, AlertCircle, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useJobBrowse } from "./hooks/useJobBrowse";
import { JobBrowseFilters } from "./components/JobBrowseFilters";
import { JobBrowseCard } from "./components/JobBrowseCard";
import { JobDetailSheet } from "./components/JobDetailSheet";
import { ApplyModal } from "./components/ApplyModal";
import { useFreelancerBookmarks } from "../freelancer/freelancer-bookmarks/hooks/useFreelancerBookmarks";
import { useUserProfile } from "@/components/shared/providers/UserProfileProvider";
import { RegisterRequiredModal } from "./components/RegisterRequiredModal";
import { PublicJobSkeleton } from "@/modules/public/find-jobs/components/PublicJobSkeleton";
import { PublicJobPosting } from "./types";


export default function JobBrowseModule() {
  const {
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
  } = useJobBrowse();

  const { bookmarkedJobIds, toggleBookmark, fetchBookmarks } = useFreelancerBookmarks();
  const userProfile = useUserProfile();
  const isGuest = !userProfile || userProfile.email === "guest@example.com";
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      fetchBookmarks();
      fetchApplications();
    }
  }, [fetchBookmarks, fetchApplications, isGuest]);

  useEffect(() => {
    if (typeof window !== "undefined" && jobs.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const openJobId = params.get("open_job");
      if (openJobId) {
        const matched = jobs.find((j) => j.job_id === Number(openJobId));
        if (matched) {
          openDetail(matched);
        }
      }
    }
  }, [jobs, openDetail]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback Ref: mounts and observes immediately when DOM node is attached, regardless of AnimatePresence
  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node || !hasMore || loading || loadingMore) return;

      const scrollContainer = node.closest("main") || null;

      console.log("[JobBrowseModule] 📌 Sentinel mounted into DOM. Target scrollContainer:", scrollContainer?.tagName || "WINDOW");

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            console.log("[JobBrowseModule] 👁️ Sentinel intersected viewport -> calling loadMore()");
            loadMore();
          }
        },
        {
          root: scrollContainer,
          rootMargin: "500px",
        }
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [hasMore, loading, loadingMore, loadMore]
  );

  // Global capture scroll listener on window/document/main
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const handleScroll = (e: Event) => {
      const target = (e.target as HTMLElement) || document.documentElement;
      let nearBottom = false;

      if (target instanceof HTMLElement && target.scrollHeight > target.clientHeight) {
        const { scrollTop, scrollHeight, clientHeight } = target;
        if (scrollHeight - (scrollTop + clientHeight) < 600) {
          nearBottom = true;
        }
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600) {
        nearBottom = true;
      }

      if (nearBottom) {
        console.log("[JobBrowseModule] 📜 Scroll triggered near bottom -> calling loadMore()");
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  const handleApply = (job: PublicJobPosting) => {
    if (isGuest) {
      setRegisterModalOpen(true);
    } else {
      openApply(job);
    }
  };

  const handleToggleBookmark = (jobId: number) => {
    if (isGuest) {
      setRegisterModalOpen(true);
    } else {
      toggleBookmark(jobId);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-emerald-950 via-zinc-900 to-teal-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
              <Briefcase className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Find Work</h1>
              <p className="text-sm text-zinc-300 mt-1">
                {totalCount} active job{totalCount !== 1 ? "s" : ""} available
              </p>
            </div>
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
          totalCount={totalCount}
          filteredCount={filteredCount}
        />

        {/* Job Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="freelancer-jobs-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <PublicJobSkeleton key={i} />
              ))}
            </motion.div>
          ) : jobs.length === 0 ? (
            <motion.div
              key="freelancer-jobs-empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-dashed rounded-3xl bg-card/50"
            >
              <div className="p-4 bg-muted/40 rounded-2xl">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No jobs found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your filters or search terms
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <motion.div
                key={`freelancer-jobs-grid-${filterJobType}-${filterArrangement}-${filterExperience}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {jobs.map((job, idx) => (
                  <motion.div
                    key={job.job_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min((idx % 12) * 0.04, 0.3) }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="h-full"
                  >
                    <JobBrowseCard
                      job={job}
                      onViewDetail={openDetail}
                      isBookmarked={bookmarkedJobIds.includes(job.job_id)}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Seamless preloading sentinel */}
              {hasMore && (
                <div ref={sentinelCallbackRef} className="h-14 w-full flex items-center justify-center py-4">
                  <button
                    type="button"
                    onClick={() => loadMore()}
                    disabled={loadingMore}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted px-4 py-2 rounded-full border border-border/50 transition-colors"
                  >
                    {loadingMore ? (
                      <>
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span>Loading more jobs...</span>
                      </>
                    ) : (
                      <span>Loading more jobs...</span>
                    )}
                  </button>
                </div>
              )}

              {!hasMore && jobs.length > 0 && (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <span>Showing all {filteredCount} job{filteredCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>


      {/* Job Detail Sheet */}
      <JobDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onClose={closeDetail}
        onApply={handleApply}
        appliedJobIds={appliedJobIds}
        bookmarkedJobIds={bookmarkedJobIds}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Apply Modal */}
      <ApplyModal
        job={selectedJob}
        open={applyModalOpen}
        onClose={closeApply}
        onSuccess={() => fetchJobs(true)}
      />

      {/* Register Required Modal */}
      <RegisterRequiredModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />
    </div>
  );
}
