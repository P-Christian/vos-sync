// src/modules/client/jobs/components/JobStatusBadge.tsx
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { JobStatus } from "../types";

const STATUS_STYLES: Record<JobStatus, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  DRAFT:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  CLOSED:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400",
};

interface JobStatusBadgeProps {
  status: JobStatus;
}

export default function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[status] ?? STATUS_STYLES.CLOSED}`}
    >
      {status === "ACTIVE" ? "Active" : status === "DRAFT" ? "Draft" : "Closed"}
    </Badge>
  );
}

