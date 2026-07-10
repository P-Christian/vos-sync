// src/modules/client/jobs/components/JobCard.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Clock, Briefcase, Pencil, X } from "lucide-react";
import JobStatusBadge from "./JobStatusBadge";
import { JobPosting, JOB_TYPE_LABELS } from "../types";

interface JobCardProps {
  job: JobPosting;
  onEdit: (job: JobPosting) => void;
  onClose: (jobId: number) => void;
}

function formatSalary(min?: number | null, max?: number | null, negotiable?: boolean): string {
  if (negotiable) return "Negotiable";
  if (!min && !max) return "Undisclosed";
  if (min && max) return `₱${min.toLocaleString()} – ₱${max.toLocaleString()}`;
  if (min) return `₱${min.toLocaleString()}+`;
  if (max) return `Up to ₱${max.toLocaleString()}`;
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

export default function JobCard({ job, onEdit, onClose }: JobCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow duration-200 border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">
                {job.job_title}
              </h3>
              <JobStatusBadge status={job.status} />
            </div>
            {job.job_department && (
              <p className="text-xs text-zinc-500 mt-0.5">{job.job_department}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.job_location}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {job.applicants_count ?? 0} applicant{(job.applicants_count ?? 0) !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(job.created_at)}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              {formatSalary(job.salary_min, job.salary_max, job.salary_negotiable)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(job)}
              className="h-8 px-3 text-xs gap-1 rounded-lg"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            {job.status !== "CLOSED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onClose(job.job_id)}
                className="h-8 px-3 text-xs gap-1 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <X className="h-3 w-3" />
                Close
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

