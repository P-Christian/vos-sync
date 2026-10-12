"use client";

// src/modules/client/talent-search/components/TalentFilters.tsx

import React, { useState } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="border-b border-border/70 pb-3 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-semibold text-foreground/85 uppercase tracking-wider py-2 hover:text-foreground transition-colors max-md:min-h-10"
      >
        <span>{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
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
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
          <AnimatePresence>
            {activeCount > 0 && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Badge className="h-5 px-1.5 text-xs bg-primary text-primary-foreground border-0 font-bold">
                  {activeCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              onFilterChange("skills", []);
              onFilterChange("location", "");
              onFilterChange("experience_level", "");
              onFilterChange("availability", "");
              onFilterChange("school_id", "");
            }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors max-md:min-h-10"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
        {/* Skills */}
        <FilterSection title="Skills">
          <div className="space-y-2.5">
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
                className="max-md:h-10 max-md:text-base md:h-8 md:text-xs rounded-lg border-border bg-background"
              />
              <Button
                size="sm"
                onClick={() => addSkill(skillInput)}
                disabled={!skillInput.trim()}
                className="h-8 max-md:min-h-10 px-3 text-xs rounded-lg shrink-0 shadow-2xs"
              >
                Add
              </Button>
            </div>

            {/* Added skills */}
            {filters.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {filters.skills.map((skill) => (
                    <motion.span
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-medium shadow-2xs"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-destructive transition-colors p-0.5"
                        title={`Remove ${skill}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Quick skill chips */}
            <div className="flex flex-wrap gap-1 pt-1">
              {COMMON_SKILLS.filter((s) => !filters.skills.includes(s)).slice(0, 10).map((skill) => (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={skill}
                  type="button"
                  onClick={() => addSkill(skill)}
                  className="px-2 py-0.5 rounded-full text-xs border border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  + {skill}
                </motion.button>
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
            className="max-md:h-10 max-md:text-base md:h-8 md:text-xs rounded-lg border-border bg-background"
          />
        </FilterSection>

        {/* Experience Level */}
        <FilterSection title="Experience Level">
          <div className="space-y-1">
            {(Object.entries(EXPERIENCE_LEVEL_LABELS) as [ExperienceLevel, string][]).map(([level, label]) => (
              <button
                key={level}
                type="button"
                onClick={() =>
                  onFilterChange("experience_level", filters.experience_level === level ? "" : level)
                }
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                  filters.experience_level === level
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                type="button"
                onClick={() =>
                  onFilterChange("availability", filters.availability === status ? "" : status)
                }
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                  filters.availability === status
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* School */}
        <FilterSection title="School">
          <Input
            placeholder="School name or acronym…"
            value={filters.school_id}
            onChange={(e) => onFilterChange("school_id", e.target.value)}
            className="max-md:h-10 max-md:text-base md:h-8 md:text-xs rounded-lg border-border bg-background"
          />
        </FilterSection>
      </div>

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          id="talent-filter-apply"
          onClick={onApply}
          className="w-full h-9 max-md:min-h-10 rounded-xl font-semibold text-sm shadow-2xs"
        >
          Apply Filters
        </Button>
      </motion.div>
    </div>
  );
}
