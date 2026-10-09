// src/modules/freelancer/freelancer-applications/components/application-table/AssessmentDueBadge.tsx
"use client";

import React from "react";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  /**
   * Attempt deadline (ISO) from the freelancer assessment API. Null when the
   * stage has no submission window; the badge then renders without a date.
   */
  deadline?: string | null;
}

function formatDeadline(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

/** Row indicator for an assessment attempt that needs freelancer action. */
export function AssessmentDueBadge({ deadline = null }: Props) {
  const formattedDeadline = deadline ? formatDeadline(deadline) : null;
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <ClipboardList />
      Assessment due
      {formattedDeadline ? <span className="font-normal">· {formattedDeadline}</span> : null}
    </Badge>
  );
}
