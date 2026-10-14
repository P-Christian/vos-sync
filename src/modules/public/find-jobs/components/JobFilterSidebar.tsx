// src/modules/public/find-jobs/components/JobFilterSidebar.tsx
"use client";

import React from "react";
import { Filter, RotateCcw, Briefcase, Laptop } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className="group relative overflow-hidden bg-white/85 dark:bg-card/75 backdrop-blur-xl border border-border/80 rounded-2xl p-5 flex flex-col gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] sticky top-20 max-md:static"
    >
      {/* Pointer Hover Spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--info) / 0.12), transparent 60%)",
        }}
      />

      {/* Header with Active Badge & Reset */}
      <div className="relative z-10 flex items-center justify-between border-b border-border/70 pb-3">
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Filter Positions
          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.div
                key={activeFilterCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold shadow-2xs">
                  {activeFilterCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </h3>
        <AnimatePresence>
          {activeFilterCount > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onResetFilters}
              className="group/reset text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 transition-transform duration-300 group-hover/reset:-rotate-90" />
              <span>Reset</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Work Setup Filter */}
      <div className="relative z-10 space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Laptop className="h-3.5 w-3.5 text-primary" /> Work Setup
        </label>
        <div className="space-y-1.5">
          {WORK_SETUPS.map((setup) => {
            const isSelected = selectedWorkSetup.toLowerCase() === setup.toLowerCase();
            return (
              <motion.button
                key={setup}
                type="button"
                whileHover={{ x: isSelected ? 0 : 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onWorkSetupChange(setup)}
                className={`relative w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-colors duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? "text-primary-foreground font-bold shadow-xs"
                    : "text-foreground hover:text-primary bg-muted/30 hover:bg-primary/[0.08] border border-transparent hover:border-primary/20"
                }`}
              >
                {/* Smooth Sliding Pill Indicator */}
                {isSelected && (
                  <motion.span
                    layoutId="activeWorkSetupPill"
                    className="absolute inset-0 rounded-xl bg-primary z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{setup === "All" ? "All Work Setups" : setup}</span>
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="relative z-10 h-1.5 w-1.5 rounded-full bg-primary-foreground shadow-xs shrink-0"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Job Type Filter */}
      <div className="relative z-10 space-y-3 pt-3 border-t border-border/70">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-primary" /> Job Employment Type
        </label>
        <div className="space-y-1.5">
          {JOB_TYPES.map((type) => {
            const isSelected = selectedJobType.toLowerCase() === type.toLowerCase();
            return (
              <motion.button
                key={type}
                type="button"
                whileHover={{ x: isSelected ? 0 : 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onJobTypeChange(type)}
                className={`relative w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-colors duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? "text-primary-foreground font-bold shadow-xs"
                    : "text-foreground hover:text-primary bg-muted/30 hover:bg-primary/[0.08] border border-transparent hover:border-primary/20"
                }`}
              >
                {/* Smooth Sliding Pill Indicator */}
                {isSelected && (
                  <motion.span
                    layoutId="activeJobTypePill"
                    className="absolute inset-0 rounded-xl bg-primary z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{type === "All" ? "All Job Types" : type}</span>
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="relative z-10 h-1.5 w-1.5 rounded-full bg-primary-foreground shadow-xs shrink-0"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

