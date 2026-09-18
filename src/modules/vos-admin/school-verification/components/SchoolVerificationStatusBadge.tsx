// src/modules/vos-admin/school-verification/components/SchoolVerificationStatusBadge.tsx
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { VerificationStatus } from "../types";
import { motion } from "framer-motion";

interface SchoolVerificationStatusBadgeProps {
  status: VerificationStatus | string;
  workflowStatus?: string | null;
}

export const SchoolVerificationStatusBadge: React.FC<SchoolVerificationStatusBadgeProps> = ({
  status,
  workflowStatus,
}) => {
  const normStatus = String(status || "PENDING_VERIFICATION").toUpperCase();
  const normWorkflow = workflowStatus ? String(workflowStatus).toUpperCase() : "";

  let label = "Pending Review";
  let variant = "warning";

  if (normStatus === "VERIFIED") {
    label = "Verified";
    variant = "success";
  } else if (normStatus === "REJECTED") {
    label = "Rejected";
    variant = "destructive";
  } else if (normStatus === "SUSPENDED") {
    label = "Suspended";
    variant = "destructive";
  } else if (normStatus === "CORRECTION_REQUIRED" || normWorkflow === "CORRECTION_REQUIRED") {
    label = "Correction Required";
    variant = "warning";
  } else if (normStatus === "IN_REVIEW" || normWorkflow === "IN_REVIEW") {
    label = "In Review";
    variant = "secondary";
  } else if (normStatus === "DRAFT") {
    label = "Draft";
    variant = "outline";
  } else {
    label = "Pending";
    variant = "warning";
  }

  const styleMap: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    destructive: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    secondary: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    outline: "bg-muted text-muted-foreground border-border",
  };

  const extraClass = styleMap[variant] || styleMap.outline;

  return (
    <motion.div
      key={`${status}-${workflowStatus || ""}`}
      initial={{ scale: 0.92, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 26 }}
      className="inline-flex"
    >
      <Badge variant="outline" className={`font-medium px-2.5 py-0.5 rounded-full border text-xs ${extraClass}`}>
        {label}
      </Badge>
    </motion.div>
  );
};
