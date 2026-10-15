"use client";

// src/modules/client/jobs/components/JobListControls.tsx
//
// Drop these into the page that owns the search/filters. Example at the bottom of this file.

import React from "react";
import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { JobStatus } from "../types";
import { getJobMeta, getStatusStyle } from "../job-helpers";

export type StatusFilter = "ALL" | JobStatus;
export type JobSort = "newest" | "applicants" | "attention";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function countByStatus(jobs: Array<{ status: string }>): Record<string, number> {
  const counts: Record<string, number> = { ALL: jobs.length, ACTIVE: 0, DRAFT: 0, CLOSED: 0 };
  for (const job of jobs) counts[job.status] = (counts[job.status] ?? 0) + 1;
  return counts;
}

const postedTime = (job: object) => {
  const raw = getJobMeta(job).postedAt;
  const t = raw ? new Date(raw.replace(" ", "T")).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
};

export function sortJobs<T extends { job_id: number }>(jobs: T[], sort: JobSort): T[] {
  const byNewest = (a: T, b: T) => postedTime(b) - postedTime(a) || b.job_id - a.job_id;
  const applicants = (j: T) => getJobMeta(j).applicantCount ?? 0;

  return [...jobs].sort((a, b) => {
    if (sort === "applicants") return applicants(b) - applicants(a) || byNewest(a, b);
    // "attention": fewest applicants first, so jobs that need promoting float to the top
    if (sort === "attention") return applicants(a) - applicants(b) || byNewest(a, b);
    return byNewest(a, b);
  });
}

// ─── Status tabs ──────────────────────────────────────────────────────────────

const TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE" as JobStatus, label: "Active" },
  { value: "DRAFT" as JobStatus, label: "Draft" },
  { value: "CLOSED" as JobStatus, label: "Closed" },
];

interface TabsProps {
  value: StatusFilter;
  counts: Record<string, number>;
  onChange: (value: StatusFilter) => void;
}

export function JobStatusTabs({ value, counts, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
    >
      {TABS.map((tab) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors max-md:min-h-9",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.value !== "ALL" && (
              <span className={cn("h-2 w-2 rounded-full", getStatusStyle(tab.value).dot)} aria-hidden />
            )}
            {tab.label}
            <span className="text-xs tabular-nums text-muted-foreground">{counts[tab.value] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

export function JobSortSelect({ value, onChange }: { value: JobSort; onChange: (v: JobSort) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as JobSort)}>
      <SelectTrigger aria-label="Sort jobs" className="h-9 w-full gap-2 rounded-lg sm:w-52">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Newest first</SelectItem>
        <SelectItem value="applicants">Most applicants</SelectItem>
        <SelectItem value="attention">Needs attention (fewest applicants)</SelectItem>
      </SelectContent>
    </Select>
  );
}

/*
  Usage in your page:

  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<JobSort>("newest");

  const counts = countByStatus(allJobs);                       // counts ignore search + dropdown filters
  const visible = sortJobs(
    filteredJobs.filter((j) => status === "ALL" || j.status === status),
    sort
  );

  <header>  {counts.ACTIVE} active · {counts.DRAFT} draft · {counts.CLOSED} closed  </header>
  <JobStatusTabs value={status} counts={counts} onChange={setStatus} />
  <JobSortSelect value={sort} onChange={setSort} />
  <JobList jobs={visible} totalJobsCount={allJobs.length} hasActiveFilters={...} ... />

  You can then remove the "All Status" dropdown.
*/
