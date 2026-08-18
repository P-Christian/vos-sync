// src/modules/client/jobs/components/JobStatusBadge.tsx
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { JobStatus } from "../types";
import { motion } from "framer-motion";

const STATUS_STYLES: Record<JobStatus, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  DRAFT:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  CLOSED:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-450",
};

interface JobStatusBadgeProps {
  status: JobStatus;
}

export default function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return (
    <motion.div
      key={status}
      initial={{ scale: 0.92, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
    >
      <Badge
        variant="outline"
        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
          STATUS_STYLES[status] ?? STATUS_STYLES.CLOSED
        }`}
      >
        {status === "ACTIVE" ? "Active" : status === "DRAFT" ? "Draft" : "Closed"}
      </Badge>
    </motion.div>
  );
}
