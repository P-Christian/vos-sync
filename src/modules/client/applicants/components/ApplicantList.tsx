// src/modules/client/applicants/components/ApplicantList.tsx
"use client";

import React from "react";
import { Applicant, ApplicationStatus } from "../types";
import ApplicantCard from "./ApplicantCard";
import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ApplicantListProps {
  applicants: Applicant[];
  onUpdateStatus: (applicant: Applicant) => void;
  onQuickStatusUpdate?: (applicant: Applicant, status: ApplicationStatus) => void;
  onScheduleInterview: (applicant: Applicant) => void;
  onViewScheduledInterview?: (interviewId: number) => void;
  onViewDetails: (applicant: Applicant) => void;
}

export default function ApplicantList({
  applicants,
  onUpdateStatus,
  onQuickStatusUpdate,
  onScheduleInterview,
  onViewScheduledInterview,
  onViewDetails,
}: ApplicantListProps) {
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
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
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
              onScheduleInterview={onScheduleInterview}
              onViewScheduledInterview={onViewScheduledInterview}
              onViewDetails={onViewDetails}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}




