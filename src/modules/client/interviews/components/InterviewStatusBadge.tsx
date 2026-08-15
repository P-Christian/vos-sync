"use client";

// src/modules/client/interviews/components/InterviewStatusBadge.tsx

import React from "react";
import { InterviewStatus, INTERVIEW_STATUS_LABELS } from "../types";
import { cn } from "@/lib/utils";

interface InterviewStatusBadgeProps {
  status: InterviewStatus;
}

const STATUS_COLORS: Record<InterviewStatus, string> = {
  SCHEDULED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60",
  CONFIRMED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60",
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60",
  RESCHEDULED: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60",
  COMPLETED: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60",
  NO_SHOW: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60",
};

export default function InterviewStatusBadge({ status }: InterviewStatusBadgeProps) {
  const label = INTERVIEW_STATUS_LABELS[status] ?? status;
  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS.SCHEDULED;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
        colorClass
      )}
    >
      {label}
    </span>
  );
}
