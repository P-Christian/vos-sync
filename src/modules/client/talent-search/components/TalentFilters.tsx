"use client";

// src/modules/client/talent-search/components/TalentFilters.tsx

import React, { useState } from "react";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TalentFilters, ExperienceLevel, AvailabilityStatus, EXPERIENCE_LEVEL_LABELS, AVAILABILITY_LABELS } from "../types";

interface TalentFiltersProps {
  filters: TalentFilters;
  onFilterChange: <K extends keyof TalentFilters>(key: K, value: TalentFilters[K]) => void;
  onApply: () => void;
}

const COMMON_SKILLS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js",
  "Python", "Java", "SQL", "MySQL", "MongoDB",
  "Vue", "Angular", "PHP", "Laravel", "Docker",
  "AWS", "Figma", "Photoshop", "Excel", "AutoCAD",
];

function FilterSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider py-2"
      >
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export default function TalentFiltersPanel({ filters, onFilterChange, onApply }: TalentFiltersProps) {
  const [skillInput, setSkillInput] = useState("");

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || filters.skills.includes(trimmed)) return;
    onFilterChange("skills", [...filters.skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    onFilterChange("skills", filters.skills.filter((s) => s !== skill));
  };

  const activeCount = [
    filters.skills.length > 0,
    !!filters.location,
    !!filters.experience_level,
    !!filters.availability,
    !!filters.school_id,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Filters</span>
          {activeCount > 0 && (
            <Badge className="h-5 px-1.5 text-xs bg-indigo-500 text-white border-0">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => {
              onFilterChange("skills", []);
              onFilterChange("location", "");
              onFilterChange("experience_level", "");
              onFilterChange("availability", "");
              onFilterChange("school_id", "");
            }}
            className="text-xs text-zinc-400 hover:text-rose-500 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
        {/* Skills */}
        <FilterSection title="Skills">
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <Input
                placeholder="Add skill…"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                className="h-8 text-xs rounded-lg"
              />
              <Button
                size="sm"
                onClick={() => addSkill(skillInput)}
                disabled={!skillInput.trim()}
                className="h-8 px-3 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white border-0 shrink-0"
              >
                Add
              </Button>
            </div>

            {/* Added skills */}
            {filters.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {filters.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="hover:text-rose-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick skill chips */}
            <div className="flex flex-wrap gap-1">
              {COMMON_SKILLS.filter((s) => !filters.skills.includes(s)).slice(0, 10).map((skill) => (
                <button
                  key={skill}
                  onClick={() => addSkill(skill)}
                  className="px-2 py-0.5 rounded-full text-xs border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Location */}
        <FilterSection title="Location">
          <Input
            placeholder="City or province…"
            value={filters.location}
            onChange={(e) => onFilterChange("location", e.target.value)}
            className="h-8 text-xs rounded-lg"
          />
        </FilterSection>

        {/* Experience Level */}
        <FilterSection title="Experience Level">
          <div className="space-y-1">
            {(Object.entries(EXPERIENCE_LEVEL_LABELS) as [ExperienceLevel, string][]).map(([level, label]) => (
              <button
                key={level}
                onClick={() =>
                  onFilterChange("experience_level", filters.experience_level === level ? "" : level)
                }
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                  filters.experience_level === level
                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Availability */}
        <FilterSection title="Availability">
          <div className="space-y-1">
            {(Object.entries(AVAILABILITY_LABELS) as [AvailabilityStatus, string][]).map(([status, label]) => (
              <button
                key={status}
                onClick={() =>
                  onFilterChange("availability", filters.availability === status ? "" : status)
                }
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                  filters.availability === status
                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>

      <Button
        id="talent-filter-apply"
        onClick={onApply}
        className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm border-0"
      >
        Apply Filters
      </Button>
    </div>
  );
}
