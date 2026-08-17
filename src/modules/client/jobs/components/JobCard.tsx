// src/modules/client/jobs/components/JobCard.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { MapPin, Users, Clock, Briefcase, Landmark, Banknote, ChevronRight } from "lucide-react";
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

// Border accent per status
const STATUS_BORDER: Record<JobStatus, string> = {
  ACTIVE: "border-l-primary",
  DRAFT: "border-l-amber-500",
  CLOSED: "border-l-rose-500",
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

export default function JobCard({
  job,
  onView,
}: JobCardProps) {
  const descData = parseJsonField(job.job_description);
  const reqsData = parseJsonField(job.job_requirements);

  const category = (descData.job_category as string) || (job.job_category as string) || "";
  const arrangement = (descData.work_arrangement as string) || (job.work_arrangement as string) || "Remote";
  const salaryType = (reqsData.salary_type as string) || (job.salary_type as string) || "Salary Range";

  return (
    <motion.div
      layout="position"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full"
    >
      <TooltipProvider delayDuration={2000}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              onClick={() => onView(job)}
              className={[
                "group hover:shadow-md py-0 overflow-hidden cursor-pointer",
                "border border-border/80 hover:border-primary/50",
                "bg-card shadow-sm",
                "hover:-translate-y-[1px]",
                "border-l-4",
                STATUS_BORDER[job.status] ?? "border-l-muted",
                "transition-all duration-300 ease-in-out",
              ].join(" ")}
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                  {/* ── Left: Main Job Details ──────────────────────── */}
                  <div className="min-w-0 flex-1 space-y-2.5">

                    {/* Title & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug tracking-tight group-hover:text-primary transition-colors duration-200">
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
                      <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        <span>{job.job_department} Department</span>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        {job.job_location}
                      </span>
                      <span className="h-3 w-px bg-border hidden sm:block" />
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                      </span>
                      <span className="h-3 w-px bg-border hidden sm:block" />
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        {job.applicants_count ?? 0} applicant{(job.applicants_count ?? 0) !== 1 ? "s" : ""}
                      </span>
                      <span className="h-3 w-px bg-border hidden sm:block" />
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
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

                  {/* ── Right: Clean Primary ATS Action ───────────────── */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                    <Link
                      href={`/vos-sync/client/applicants?job_id=${job.job_id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3.5 text-xs gap-2 rounded-xl border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 font-semibold shadow-xs"
                      >
                        <Users className="h-3.5 w-3.5 text-primary" />
                        View Applicants
                        {typeof job.applicants_count === "number" && job.applicants_count > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                            {job.applicants_count}
                          </span>
                        )}
                        <ChevronRight className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </Button>
                    </Link>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Click to preview and edit job details
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}

