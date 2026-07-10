// src/modules/client/interviews/components/InterviewStatusBadge.tsx
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { InterviewStatus, INTERVIEW_STATUS_LABELS } from "../types";

const STATUS_STYLES: Record<InterviewStatus, string> = {
  CONFIRMED:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  CANCELLED:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
  RESCHEDULED:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  COMPLETED:
    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  NO_SHOW:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400",
};

interface InterviewStatusBadgeProps {
  status: InterviewStatus;
}

export default function InterviewStatusBadge({ status }: InterviewStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[status] ?? ""}`}
    >
      {INTERVIEW_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

