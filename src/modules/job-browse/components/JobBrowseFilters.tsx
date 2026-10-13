"use client";

import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
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

const JOB_TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  ...(Object.entries(JOB_TYPE_LABELS) as [JobType, string][]).map(([k, v]) => ({
    value: k,
    label: v,
  })),
];

const ARRANGEMENT_OPTIONS = [
  { value: "ALL", label: "All Arrangements" },
  { value: "Remote", label: "Remote" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "On-site", label: "On-site" },
];

const EXPERIENCE_OPTIONS = [
  { value: "ALL", label: "All Levels" },
  ...(Object.entries(EXPERIENCE_LEVEL_LABELS) as [ExperienceLevel, string][]).map(([k, v]) => ({
    value: k,
    label: v,
  })),
];

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
          className="pl-9 h-11 md:h-10 rounded-xl text-base md:text-sm"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm md:text-xs text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>

        {/* Job Type */}
        <SearchableSelect
          value={filterJobType}
          onValueChange={(v) => onJobTypeChange(v as JobType | "ALL")}
          options={JOB_TYPE_OPTIONS}
          placeholder="Job Type"
          triggerClassName="h-8 w-36 text-sm md:text-xs rounded-lg max-md:min-h-11"
        />

        {/* Work Arrangement */}
        <SearchableSelect
          value={filterArrangement}
          onValueChange={(v) => onArrangementChange(v as WorkArrangement | "ALL")}
          options={ARRANGEMENT_OPTIONS}
          placeholder="Arrangement"
          triggerClassName="h-8 w-36 text-sm md:text-xs rounded-lg max-md:min-h-11"
        />

        {/* Experience Level */}
        <SearchableSelect
          value={filterExperience}
          onValueChange={(v) => onExperienceChange(v as ExperienceLevel | "ALL")}
          options={EXPERIENCE_OPTIONS}
          placeholder="Experience"
          triggerClassName="h-8 w-40 text-sm md:text-xs rounded-lg max-md:min-h-11"
        />

        <span className="ml-auto text-sm md:text-xs text-muted-foreground">
          {filteredCount === totalCount
            ? `${totalCount} active job${totalCount !== 1 ? "s" : ""}`
            : `${filteredCount} of ${totalCount} active jobs`}
        </span>
      </div>
    </div>
  );
}
