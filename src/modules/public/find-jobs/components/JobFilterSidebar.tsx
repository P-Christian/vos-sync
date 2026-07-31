// src/modules/public/find-jobs/components/JobFilterSidebar.tsx
"use client";

import React from "react";
import { Filter, RotateCcw, Briefcase, Laptop, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  selectedJobType: string;
  selectedWorkSetup: string;
  onJobTypeChange: (type: string) => void;
  onWorkSetupChange: (setup: string) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
}

const JOB_TYPES = ["All", "Full Time", "Part Time", "Contract", "Freelance", "Internship"];
const WORK_SETUPS = ["All", "Remote", "On-site", "Hybrid"];

export function JobFilterSidebar({
  selectedJobType,
  selectedWorkSetup,
  onJobTypeChange,
  onWorkSetupChange,
  onResetFilters,
  activeFilterCount,
}: Props) {
  return (
    <div className="bg-card border rounded-2xl p-5 space-y-6 shadow-xs sticky top-20">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Filter Positions
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {activeFilterCount}
            </Badge>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors font-medium"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {/* Work Setup Filter */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Laptop className="h-3.5 w-3.5 text-primary" /> Work Setup
        </label>
        <div className="space-y-1.5">
          {WORK_SETUPS.map((setup) => {
            const isSelected = selectedWorkSetup.toLowerCase() === setup.toLowerCase();
            return (
              <button
                key={setup}
                type="button"
                onClick={() => onWorkSetupChange(setup)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/30 hover:bg-muted text-foreground"
                }`}
              >
                <span>{setup === "All" ? "All Work Setups" : setup}</span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Type Filter */}
      <div className="space-y-3 pt-3 border-t">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-primary" /> Job Employment Type
        </label>
        <div className="space-y-1.5">
          {JOB_TYPES.map((type) => {
            const isSelected = selectedJobType.toLowerCase() === type.toLowerCase();
            return (
              <button
                key={type}
                type="button"
                onClick={() => onJobTypeChange(type)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/30 hover:bg-muted text-foreground"
                }`}
              >
                <span>{type === "All" ? "All Job Types" : type}</span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
