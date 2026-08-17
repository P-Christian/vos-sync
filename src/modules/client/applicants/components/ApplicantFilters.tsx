// src/modules/client/applicants/components/ApplicantFilters.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import { ApplicantFilterStatus } from "../types";

interface ApplicantFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: ApplicantFilterStatus;
  onStatusChange: (v: ApplicantFilterStatus) => void;
  counts?: Record<ApplicantFilterStatus, number>;
}

const PIPELINE_STATUS_OPTIONS: Array<{
  key: ApplicantFilterStatus;
  label: string;
  description: string;
}> = [
  {
    key: "ACTIVE_PIPELINE",
    label: "Active Pipeline",
    description: "In-progress candidates (Applied, Under Review, Shortlisted, Interviewing), excluding Hired, Rejected, and Withdrawn.",
  },
  {
    key: "ALL",
    label: "All Candidates",
    description: "All applicants across all hiring stages.",
  },
  {
    key: "APPLIED",
    label: "Applied",
    description: "New submissions awaiting initial review.",
  },
  {
    key: "UNDER_REVIEW",
    label: "Under Review",
    description: "Candidates undergoing profile and resume evaluation.",
  },
  {
    key: "SHORTLISTED",
    label: "Shortlisted",
    description: "Qualified candidates selected for interview rounds.",
  },
  {
    key: "INTERVIEWING",
    label: "Interviewing",
    description: "Candidates with active or scheduled interview sessions.",
  },
  {
    key: "HIRED",
    label: "Hired",
    description: "Candidates accepted and marked as hired.",
  },
  {
    key: "REJECTED",
    label: "Rejected",
    description: "Applicants not moving forward in the pipeline.",
  },
  {
    key: "WITHDRAWN",
    label: "Withdrawn",
    description: "Candidates who withdrew their application.",
  },
];

export default function ApplicantFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  counts,
}: ApplicantFiltersProps) {
  return (
    <div className="space-y-3.5">
      {/* Active Pipeline & Status Badges Filter on Top with Popover Tooltips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
        {PIPELINE_STATUS_OPTIONS.map((item) => {
          const isSelected = status === item.key;
          const count = counts ? counts[item.key] ?? 0 : undefined;

          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onStatusChange(item.key)}
                  aria-label={`${item.label} filter (${item.description})`}
                  className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/20"
                      : "bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/80"
                  }`}
                >
                  <span>{item.label}</span>
                  {typeof count === "number" && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full font-semibold pointer-events-none transition-colors ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/90 group-hover:text-foreground"
                      }`}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p className="font-semibold text-[11px] mb-0.5">{item.label}</p>
                <p className="text-[10px] opacity-90">{item.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Searchbar Below */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id="applicant-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by candidate name, email, job title, or skill..."
          className="h-10 pl-9.5 text-sm bg-background/60 border-border/80 focus-visible:ring-primary/40 rounded-xl"
        />
      </div>
    </div>
  );
}



