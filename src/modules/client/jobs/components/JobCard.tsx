// src/modules/client/jobs/components/JobCard.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Users, Clock, Briefcase, Pencil, Landmark, Banknote, ExternalLink } from "lucide-react";
import JobStatusBadge from "./JobStatusBadge";
import { JobPosting, JobStatus, JOB_TYPE_LABELS } from "../types";

interface JobCardProps {
  job: JobPosting;
  onView: (job: JobPosting) => void;
  onEdit: (job: JobPosting) => void;
  onStatusChange: (
    jobId: number,
    newStatus: JobStatus
  ) => void;
}
const parseJsonField = (value: string | null | undefined): Record<string, unknown> => {
  if (!value) return {};
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // ignore
    }
  }
  return {};
};

function formatSalary(min?: number | null, max?: number | null, negotiable?: boolean, salaryType?: string): string {
  const typeSuffix = salaryType === "Hourly Rate" ? " / hr" : "";
  if (negotiable) return "Negotiable";
  if (!min && !max) return "Undisclosed";
  if (min && max) return `₱${min.toLocaleString()} – ₱${max.toLocaleString()}${typeSuffix}`;
  if (min) return `₱${min.toLocaleString()} ${typeSuffix}`;
  if (max) return `Up to ₱${max.toLocaleString()}${typeSuffix}`;
  return "—";
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Border accent per status — transition handles the animation
const STATUS_BORDER: Record<JobStatus, string> = {
  ACTIVE: "border-l-[#14a800]",
  DRAFT: "border-l-amber-500",
  CLOSED: "border-l-rose-500",
};

// Select trigger colour per status
const STATUS_TRIGGER: Record<JobStatus, string> = {
  ACTIVE: "text-[#14a800] border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40 hover:border-emerald-400",
  DRAFT: "text-amber-600 border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/40 hover:border-amber-400",
  CLOSED: "text-rose-600 border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-800/40 hover:border-rose-450",
};

export default function JobCard({
  job,
  onView,
  onEdit,
  onStatusChange
}: JobCardProps) {
  const descData = parseJsonField(job.job_description);
  const reqsData = parseJsonField(job.job_requirements);

  const category = (descData.job_category as string) || "";
  const arrangement = (descData.work_arrangement as string) || (job.work_arrangement as string) || "Remote";
  const salaryType = (reqsData.salary_type as string) || (job.salary_type as string) || "Salary Range";

  return (
    <Card
      className={[
        "group hover:shadow-md py-0 overflow-hidden ",
        "border border-zinc-200/80 dark:border-zinc-800/80",
        "hover:border-zinc-300 dark:hover:border-zinc-700",
        "bg-white dark:bg-zinc-950/60 shadow-sm",
        "hover:-translate-y-[1px]",
        // left border — width always 4px, colour transitions smoothly
        "border-l-4",
        STATUS_BORDER[job.status] ?? "border-l-zinc-300",
        "transition-all duration-500 ease-in-out",
      ].join(" ")}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

          {/* ── Left: content ─────────────────────────────────── */}
          <div className="min-w-0 flex-1 space-y-2.5">

            {/* Title & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm sm:text-base leading-snug tracking-tight group-hover:text-[#14a800] transition-colors duration-200">
                {job.job_title}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <JobStatusBadge status={job.status} />
                {category && (
                  <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/40 dark:border-emerald-800/30 rounded-md">
                    {category}
                  </Badge>
                )}
                {arrangement && (
                  <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/40 dark:border-blue-800/30 rounded-md">
                    {arrangement}
                  </Badge>
                )}
              </div>
            </div>

            {/* Department */}
            {job.job_department && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                <Landmark className="h-3.5 w-3.5 text-zinc-400" />
                <span>{job.job_department} Department</span>
              </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                {job.job_location}
              </span>
              <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
              </span>
              <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                {job.applicants_count ?? 0} applicant{(job.applicants_count ?? 0) !== 1 ? "s" : ""}
              </span>
              <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                Posted {timeAgo(job.created_at)}
              </span>
            </div>

            {/* Salary badge */}
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-1 rounded-lg border border-emerald-100/50 dark:border-emerald-800/20">
                <Banknote className="h-3.5 w-3.5" />
                {formatSalary(job.salary_min, job.salary_max, job.salary_negotiable, salaryType)}
              </span>
            </div>
          </div>

          {/* ── Right: actions (fixed width, never shifts) ────── */}
          <div className="flex flex-row md:flex-col items-stretch gap-2 shrink-0 w-full md:w-28 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-900">
            {/* Preview */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(job)}
              className="h-8 px-3 text-xs gap-1.5 rounded-lg"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview
            </Button>
            {/* Edit — always visible */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(job)}
              className="h-8 px-3 text-xs gap-1.5 rounded-lg border-zinc-200 hover:border-emerald-500 hover:text-[#14a800] dark:hover:text-emerald-400 transition-all duration-200 font-semibold shadow-none w-full justify-center"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>

            {/* Status selector — always visible, same slot */}
            <Select
              value={job.status}
              onValueChange={(v) => onStatusChange(job.job_id, v as JobStatus)}
            >
              <SelectTrigger
                className={[
                  "h-8 text-xs font-semibold rounded-lg border w-full",
                  "transition-all duration-300",
                  STATUS_TRIGGER[job.status] ?? STATUS_TRIGGER.CLOSED,
                ].join(" ")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE" className="text-xs font-semibold text-[#14a800]">
                  Active
                </SelectItem>
                <SelectItem value="DRAFT" className="text-xs font-semibold text-amber-600">
                  Draft
                </SelectItem>
                <SelectItem value="CLOSED" className="text-xs font-semibold text-rose-600">
                  Closed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
