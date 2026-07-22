"use client";

// src/modules/client/interviews/components/InterviewStatusBadge.tsx

import React from "react";
import { InterviewStatus, INTERVIEW_STATUS_LABELS } from "../types";
import { cn } from "@/lib/utils";

interface InterviewStatusBadgeProps {
  status: InterviewStatus;
}

const STATUS_COLORS: Record<InterviewStatus, string> = {
  SCHEDULED: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/50",
  CONFIRMED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/50",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50",
  RESCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/50",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/50",
  NO_SHOW: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/50",
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
