// src/modules/client/company-profile/components/CompanyCompletionBar.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

interface CompanyCompletionBarProps {
  percent: number;
  missingSections?: string[];
}

export default function CompanyCompletionBar({ percent, missingSections }: CompanyCompletionBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const isComplete = clamped >= 100;

  const label =
    isComplete
      ? "Profile complete! All sections filled."
      : missingSections && missingSections.length > 0
      ? `${missingSections.length} ${missingSections.length === 1 ? "section" : "sections"} remaining (${missingSections.slice(0, 3).join(", ")})`
      : clamped >= 80
      ? "Almost complete — 1 section left to finish"
      : clamped >= 50
      ? "2 sections left to complete profile"
      : "Multiple sections left to complete profile";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Profile Completion
        </span>
        <motion.span
          key={clamped}
          initial={{ opacity: 0.6, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`text-xs font-bold tabular-nums ${isComplete ? "text-success" : "text-primary"}`}
        >
          {clamped}%
        </motion.span>
      </div>

      <div className="h-2 w-full rounded-full overflow-hidden bg-muted">
        <motion.div
          className={`h-full rounded-full ${isComplete ? "bg-success" : "bg-gradient-to-r from-primary to-info"}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

