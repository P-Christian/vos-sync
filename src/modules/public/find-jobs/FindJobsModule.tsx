// src/modules/public/find-jobs/FindJobsModule.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  JobHeroBanner,
  JobFilterSidebar,
  PublicJobCard,
  PublicJobSkeleton,
  PublicJobDetailModal,
  GuestAuthModal,
} from "./components";

import { PublicJobPosting } from "./types";
import { Briefcase, AlertCircle, ArrowLeft, ArrowRight, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuthSession } from "@/hooks/useAuthSession";
import { motion, AnimatePresence } from "framer-motion";

export default function FindJobsModule() {

  const router = useRouter();
  const session = useAuthSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("All");
  const [selectedWorkSetup, setSelectedWorkSetup] = useState("All");
  
  const [jobs, setJobs] = useState<PublicJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [totalJobs, setTotalJobs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedJob, setSelectedJob] = useState<PublicJobPosting | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [authModalJob, setAuthModalJob] = useState<PublicJobPosting | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (locationQuery.trim()) params.set("location", locationQuery.trim());
        if (selectedJobType !== "All") params.set("job_type", selectedJobType);
        if (selectedWorkSetup !== "All") params.set("work_setup", selectedWorkSetup);
        params.set("page", String(page));
        params.set("limit", "12");

        const res = await fetch(`/api/public/find-jobs?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load public job postings.");
        }
        const data = await res.json();
        
        // Minimum 250ms delay for smooth skeleton shimmer transition
        const elapsed = Date.now() - startTime;
        if (elapsed < 250) {
          await new Promise((r) => setTimeout(r, 250 - elapsed));
        }

        if (isMounted) {
          setJobs(data.data || []);
          setTotalJobs(data.meta?.total || 0);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } catch (err: unknown) {
        console.error("fetchJobs error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to fetch job listings.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchJobs();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, locationQuery, selectedJobType, selectedWorkSetup, page]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleQuickCategoryClick = (tag: string) => {
    if (tag === "Remote" || tag === "On-site" || tag === "Hybrid") {
      setSelectedWorkSetup(tag);
    } else if (tag === "Full Time" || tag === "Part Time" || tag === "Contract") {
      setSelectedJobType(tag);
    } else {
      setSearchQuery(tag);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setLocationQuery("");
    setSelectedJobType("All");
    setSelectedWorkSetup("All");
    setPage(1);
  };

  const activeFilterCount =
    (selectedJobType !== "All" ? 1 : 0) +
    (selectedWorkSetup !== "All" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (locationQuery.trim() ? 1 : 0);

  const handleApplyClick = (job: PublicJobPosting) => {
    if (session.isJobSeeker) {
      router.push(`/vos-sync/freelancer/jobs?open_job=${job.job_id}`);
      return;
    }
    if (session.isEmployer) {
      setSelectedJob(job);
      setIsDetailOpen(true);
      return;
    }
    setAuthModalJob(job);
    setIsAuthModalOpen(true);
  };

  const handleSelectJob = (job: PublicJobPosting) => {
    setSelectedJob(job);
    setIsDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* 1. Hero Search Section */}
      <JobHeroBanner
        searchQuery={searchQuery}
        locationQuery={locationQuery}
        onSearchChange={setSearchQuery}
        onLocationChange={setLocationQuery}
        onSearchSubmit={handleSearchSubmit}
        totalJobs={totalJobs}
        onQuickCategoryClick={handleQuickCategoryClick}
        isLoading={loading}
      />


      {/* 2. Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Filter Sidebar (4 cols on lg) */}
          <div className="hidden md:block lg:col-span-3">
            <JobFilterSidebar
              selectedJobType={selectedJobType}
              selectedWorkSetup={selectedWorkSetup}
              onJobTypeChange={(type) => {
                setSelectedJobType(type);
                setPage(1);
              }}
              onWorkSetupChange={(setup) => {
                setSelectedWorkSetup(setup);
                setPage(1);
              }}
              onResetFilters={handleResetFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>

          {/* Right Column: Job Listings Grid (9 cols on lg) */}
          <div className="lg:col-span-9 space-y-6">
            {/* Mobile filter trigger (below md only; the inline sidebar stays at >=768) */}
            <div className="md:hidden">
              <Button
                onClick={() => setIsFilterSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isFilterSheetOpen}
                className="w-full h-11 justify-between text-sm font-semibold shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </span>
                <span className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary-foreground/20 text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </span>
              </Button>
            </div>

            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Open Job Opportunities</span>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {totalJobs} Jobs Available
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing active openings verified by our compliance team.
                </p>
              </div>

              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs h-8"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Smooth Animated Job Content Container */}

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <PublicJobSkeleton key={i} />
                  ))}

                </motion.div>
              ) : jobs.length === 0 ? (
                /* Empty State */
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-card border rounded-2xl p-8 md:p-12 text-center space-y-4 shadow-2xs"
                >
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-muted/50 text-muted-foreground flex items-center justify-center">
                    <Briefcase className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-base">No Matching Jobs Found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      We couldn&apos;t find any positions matching your search filters. Try adjusting your search query or location.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs font-semibold">
                    Reset Search Filters
                  </Button>
                </motion.div>
              ) : (
                /* Job Grid */
                <motion.div
                  key={`job-grid-${selectedJobType}-${selectedWorkSetup}-${page}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {jobs.map((job, idx) => (
                    <PublicJobCard
                      key={job.job_id}
                      job={job}
                      index={idx}
                      onSelectJob={handleSelectJob}
                      onApplyClick={handleApplyClick}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>


            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="pt-6 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="text-xs gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </Button>

                <span className="text-xs text-muted-foreground font-semibold">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="text-xs gap-1"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3b. Mobile Filter Sheet (below md only; desktop keeps the inline sidebar) */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto overscroll-contain p-0 pb-4"
        >
          <SheetHeader className="border-b pb-3">
            <SheetTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filter Positions
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pt-4">
            <JobFilterSidebar
              selectedJobType={selectedJobType}
              selectedWorkSetup={selectedWorkSetup}
              onJobTypeChange={(type) => {
                setSelectedJobType(type);
                setPage(1);
              }}
              onWorkSetupChange={(setup) => {
                setSelectedWorkSetup(setup);
                setPage(1);
              }}
              onResetFilters={handleResetFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 3. Job Detail Modal */}
      <PublicJobDetailModal
        job={selectedJob}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* 4. Guest Apply Auth Prompt Modal */}
      <GuestAuthModal
        job={authModalJob}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
