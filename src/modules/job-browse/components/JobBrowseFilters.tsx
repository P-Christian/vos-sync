"use client";

import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobType, WorkArrangement, ExperienceLevel, JOB_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS } from "../types";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterJobType: JobType | "ALL";
  onJobTypeChange: (v: JobType | "ALL") => void;
  filterArrangement: WorkArrangement | "ALL";
  onArrangementChange: (v: WorkArrangement | "ALL") => void;
  filterExperience: ExperienceLevel | "ALL";
  onExperienceChange: (v: ExperienceLevel | "ALL") => void;
  totalCount: number;
  filteredCount: number;
}

export function JobBrowseFilters({
  search,
  onSearchChange,
  filterJobType,
  onJobTypeChange,
  filterArrangement,
  onArrangementChange,
  filterExperience,
  onExperienceChange,
  totalCount,
  filteredCount,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id="job-browse-search"
          placeholder="Search jobs, companies, locations..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10 rounded-xl text-sm"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>

        {/* Job Type */}
        <Select value={filterJobType} onValueChange={(v) => onJobTypeChange(v as JobType | "ALL")}>
          <SelectTrigger id="filter-job-type" className="h-8 w-36 text-xs rounded-lg">
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">All Types</SelectItem>
            {(Object.entries(JOB_TYPE_LABELS) as [JobType, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Work Arrangement */}
        <Select value={filterArrangement} onValueChange={(v) => onArrangementChange(v as WorkArrangement | "ALL")}>
          <SelectTrigger id="filter-arrangement" className="h-8 w-36 text-xs rounded-lg">
            <SelectValue placeholder="Arrangement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">All Arrangements</SelectItem>
            <SelectItem value="Remote" className="text-xs">Remote</SelectItem>
            <SelectItem value="Hybrid" className="text-xs">Hybrid</SelectItem>
            <SelectItem value="On-site" className="text-xs">On-site</SelectItem>
          </SelectContent>
        </Select>

        {/* Experience Level */}
        <Select value={filterExperience} onValueChange={(v) => onExperienceChange(v as ExperienceLevel | "ALL")}>
          <SelectTrigger id="filter-experience" className="h-8 w-40 text-xs rounded-lg">
            <SelectValue placeholder="Experience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">All Levels</SelectItem>
            {(Object.entries(EXPERIENCE_LEVEL_LABELS) as [ExperienceLevel, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-muted-foreground">
          {filteredCount} of {totalCount} job{totalCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
