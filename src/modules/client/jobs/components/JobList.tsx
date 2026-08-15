"use client";

import React from "react";
import { JobPosting, JobStatus } from "../types";
import JobCard from "./JobCard";
import { Briefcase, SearchX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface JobListProps {
  jobs: JobPosting[];
  totalJobsCount?: number;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onView: (job: JobPosting) => void;
  onEdit: (job: JobPosting) => void;
  onStatusChange: (jobId: number, newStatus: JobStatus) => void;
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function JobList({
  jobs,
  totalJobsCount = 0,
  hasActiveFilters = false,
  onResetFilters,
  onView,
  onEdit,
  onStatusChange,
}: JobListProps) {
  if (jobs.length === 0) {
    if (hasActiveFilters && totalJobsCount > 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
          <div className="p-4 bg-muted/60 dark:bg-muted/30 rounded-2xl mb-4 border border-border/50 text-muted-foreground">
            <SearchX className="h-8 w-8" />
          </div>

          <h3 className="font-semibold text-foreground text-sm sm:text-base">
            No matching job postings
          </h3>

          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            We couldn&apos;t find any job postings matching your current search or filter criteria.
          </p>

          {onResetFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="mt-4 text-xs font-medium gap-1.5 rounded-xl border-border hover:bg-muted/50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset all filters
            </Button>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-4 bg-muted/60 dark:bg-muted/30 rounded-2xl mb-4 border border-border/50">
          <Briefcase className="h-8 w-8 text-muted-foreground" />
        </div>

        <h3 className="font-semibold text-foreground text-sm">
          No job postings yet
        </h3>

        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Create your first job posting to start attracting top talent.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      <AnimatePresence mode="popLayout">
        {jobs.map((job) => (
          <JobCard
            key={job.job_id}
            job={job}
            onView={onView}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}