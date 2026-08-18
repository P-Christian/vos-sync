"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { VerificationStatus } from "../types";
import { formatDualStatusLabel } from "../utils/companyVerification.utils";
import { motion } from "framer-motion";

interface VerificationStatusBadgeProps {
  status: VerificationStatus | string;
  workflowStatus?: string | null;
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  status,
  workflowStatus,
}) => {
  const { label, variant } = formatDualStatusLabel(status, workflowStatus);

  // Custom styling mappings for badges
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
