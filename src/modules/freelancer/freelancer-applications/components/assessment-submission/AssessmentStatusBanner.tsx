// src/modules/freelancer/freelancer-applications/components/assessment-submission/AssessmentStatusBanner.tsx
"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Clock, Eye, Send, XCircle } from "lucide-react";
import type { AssessmentAttemptDTO, AttemptStatus } from "@/modules/shared/assessment";
import { cn } from "@/lib/utils";

interface StatusMeta {
  icon: LucideIcon;
  toneClass: string;
  title: string;
  description: string;
}

const STATUS_META: Record<AttemptStatus, StatusMeta> = {
  NOT_STARTED: {
    icon: Clock,
    toneClass: "border-border bg-muted/40 text-muted-foreground",
    title: "Assessment not started",
    description: "Work through the tasks below and save a draft as you go.",
  },
  IN_PROGRESS: {
    icon: Clock,
    toneClass: "border-info/30 bg-info/10 text-info",
    title: "Draft in progress",
    description:
      "Your saved draft is loaded below. Nothing is submitted until you press Submit assessment.",
  },
  SUBMITTED: {
    icon: Send,
    toneClass: "border-info/30 bg-info/10 text-info",
    title: "Submitted",
    description: "Your answers are locked and awaiting review.",
  },
  UNDER_REVIEW: {
    icon: Eye,
    toneClass: "border-info/30 bg-info/10 text-info",
    title: "Under review",
    description: "The hiring team is reviewing your submission.",
  },
  NEEDS_REVISION: {
    icon: AlertTriangle,
    toneClass: "border-warning/40 bg-warning/10 text-warning",
    title: "Revision requested",
    description:
      "Your reviewer asked for changes. Review the notes below; a fresh attempt opens for editing once it is available.",
  },
  PASSED: {
    icon: CheckCircle2,
    toneClass: "border-success/40 bg-success/10 text-success",
    title: "Assessment passed",
    description: "This assessment was marked as passed.",
  },
  FAILED: {
    icon: XCircle,
    toneClass: "border-destructive/40 bg-destructive/10 text-destructive",
    title: "Assessment not passed",
    description: "This assessment was marked as not passed.",
  },
};

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

interface Props {
  status: AttemptStatus;
  attempt: AssessmentAttemptDTO | null;
}

export function AssessmentStatusBanner({ status, attempt }: Props) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const notes = attempt?.review_notes?.trim() ?? "";
  const submittedAt = formatDateTime(attempt?.submitted_at ?? null);
  const isRevision = attempt?.predecessor_attempt_id != null;
  const description =
    isRevision && status === "IN_PROGRESS"
      ? `${meta.description} This is a revision attempt: update your responses and submit again.`
      : meta.description;
  return (
    <div className={cn("space-y-3 rounded-xl border p-4", meta.toneClass)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">
            {meta.title}
            {attempt ? ` · Attempt ${attempt.attempt_number}` : ""}
          </p>
          <p className="text-xs leading-relaxed opacity-90">{description}</p>
          {submittedAt && <p className="text-xs opacity-80">Submitted {submittedAt}</p>}
        </div>
      </div>
      {notes !== "" && (
        <div className="rounded-lg border border-border/70 bg-card p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Reviewer notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{notes}</p>
        </div>
      )}
    </div>
  );
}
