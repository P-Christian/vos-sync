// src/modules/client/applicants/components/ApplicantList.tsx
"use client";

import React from "react";
import { Applicant, ApplicationStatus } from "../types";
import ApplicantCard from "./ApplicantCard";
import { Users, SearchX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import ErrorState from "../../components/ErrorState";

interface ApplicantListProps {
  applicants: Applicant[];
  onUpdateStatus: (applicant: Applicant) => void;
  onQuickStatusUpdate?: (applicant: Applicant, status: ApplicationStatus) => void;
  onQuickStageUpdate?: (applicant: Applicant, toStageId: number, stageName: string) => void;
  onScheduleInterview: (applicant: Applicant) => void;
  onViewScheduledInterview?: (interviewId: number) => void;
  onViewDetails: (applicant: Applicant) => void;
  onReviewAssessment?: (applicant: Applicant) => void;
  /** Applicants that exist before search/stage filters are applied. */
  totalCount?: number;
  /** Load error; only shown as the empty state when there is nothing to display. */
  error?: string;
  onRetry?: () => void;
  onClearFilters?: () => void;
}

export default function ApplicantList({
  applicants,
  onUpdateStatus,
  onQuickStatusUpdate,
  onQuickStageUpdate,
  onScheduleInterview,
  onViewScheduledInterview,
  onViewDetails,
  onReviewAssessment,
  totalCount = 0,
  error,
  onRetry,
  onClearFilters,
}: ApplicantListProps) {
  if (applicants.length === 0 && error && totalCount === 0) {
    return <ErrorState title="Couldn't load candidates" message={error} onRetry={onRetry} />;
  }

  if (applicants.length === 0 && totalCount > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-4 bg-muted/60 rounded-2xl mb-4 border border-border/40">
          <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">No candidates match these filters</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs md:text-xs">
          {totalCount} {totalCount === 1 ? "candidate is" : "candidates are"} hidden by your current search or stage filter.
        </p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-4 max-md:min-h-10">
            Show all candidates
          </Button>
        )}
      </motion.div>
    );
  }

  if (applicants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-4 bg-muted/60 rounded-2xl mb-4 border border-border/40">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">No applicants found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs md:text-xs">
          Applicants will appear here once job seekers apply to your postings.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3 relative">
      <AnimatePresence mode="popLayout" initial={false}>
        {applicants.map((a) => (
          <motion.div
            key={a.application_id}
            layout
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: -8,
              transition: { duration: 0.2, ease: "easeInOut" },
            }}
            transition={{
              duration: 0.25,
              ease: "easeOut",
              layout: { duration: 0.25, ease: "easeInOut" },
            }}
          >
            <ApplicantCard
              applicant={a}
              onUpdateStatus={onUpdateStatus}
              onQuickStatusUpdate={onQuickStatusUpdate}
              onQuickStageUpdate={onQuickStageUpdate}
              onScheduleInterview={onScheduleInterview}
              onViewScheduledInterview={onViewScheduledInterview}
              onViewDetails={onViewDetails}
              onReviewAssessment={onReviewAssessment}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}




