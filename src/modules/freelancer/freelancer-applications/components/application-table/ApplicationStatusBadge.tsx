// src/modules/freelancer/freelancer-applications/components/application-table/ApplicationStatusBadge.tsx
"use client";

import React from "react";
import { Calendar, CheckCircle, Clock, Eye, Star, XCircle, XOctagon } from "lucide-react";
import { ApplicationStatus, STATUS_LABELS } from "../../types";

type StatusConfigEntry = { icon: React.ElementType; className: string };

const statusConfig: Record<ApplicationStatus, StatusConfigEntry> = {
  DRAFT: {
    icon: Clock,
    className:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700",
  },
  APPLIED: {
    icon: Clock,
    className: "bg-secondary text-muted-foreground border-transparent",
  },
  UNDER_REVIEW: {
    icon: Eye,
    className: "bg-blue-50 text-blue-700 border-transparent dark:bg-blue-950/30 dark:text-blue-300",
  },
  SHORTLISTED: {
    icon: Star,
    className:
      "bg-purple-50 text-purple-700 border-transparent dark:bg-purple-950/30 dark:text-purple-300",
  },
  INTERVIEWING: {
    icon: Calendar,
    className: "bg-primary/15 text-primary border-transparent",
  },
  HIRED: {
    icon: CheckCircle,
    className: "bg-green-600 text-white border-transparent",
  },
  REJECTED: {
    icon: XCircle,
    className: "bg-rose-50 text-rose-600 border-transparent dark:bg-rose-950/30 dark:text-rose-400",
  },
  WITHDRAWN: {
    icon: XOctagon,
    className: "bg-zinc-100 text-zinc-500 border-transparent dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export const ApplicationStatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const config = statusConfig[status] ?? statusConfig.APPLIED;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
};
