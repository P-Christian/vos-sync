// src/modules/client/applicants/components/ApplicantList.tsx
"use client";

import React from "react";
import { Applicant } from "../types";
import ApplicantCard from "./ApplicantCard";
import { Users } from "lucide-react";

interface ApplicantListProps {
  applicants: Applicant[];
  onUpdateStatus: (applicant: Applicant) => void;
  onScheduleInterview: (applicant: Applicant) => void;
  onViewScheduledInterview?: (interviewId: number) => void;
  onViewDetails: (applicant: Applicant) => void;
}

export default function ApplicantList({
  applicants,
  onUpdateStatus,
  onScheduleInterview,
  onViewScheduledInterview,
  onViewDetails,
}: ApplicantListProps) {
  if (applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4">
          <Users className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">No applicants found</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Applicants will appear here once job seekers apply to your postings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applicants.map((a) => (
        <ApplicantCard
          key={a.application_id}
          applicant={a}
          onUpdateStatus={onUpdateStatus}
          onScheduleInterview={onScheduleInterview}
          onViewScheduledInterview={onViewScheduledInterview}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

