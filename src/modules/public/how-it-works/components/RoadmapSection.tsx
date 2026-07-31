// src/modules/public/how-it-works/components/RoadmapSection.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleGuide } from "../types";
import { StepCard } from "./StepCard";

interface Props {
  guide: RoleGuide;
}

export function RoadmapSection({ guide }: Props) {
  const scrollToStep = (e: React.MouseEvent<HTMLAnchorElement>, stepNumber: number) => {
    e.preventDefault();
    const target = document.getElementById(`step${stepNumber}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Banner for Selected Role */}
      <div className="mb-10 text-center space-y-3">
        <span className={`inline-block text-xs font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border ${guide.bgAccent} ${guide.accentColor} ${guide.borderAccent}`}>
          {guide.badgeText}
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          {guide.heading}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {guide.introduction}
        </p>

        {/* Visual Progress Dots Bar */}
        <div className="pt-4 flex items-center justify-center gap-2">
          {guide.steps.map((s) => (
            <a
              key={s.stepNumber}
              href={`#step${s.stepNumber}`}
              onClick={(e) => scrollToStep(e, s.stepNumber)}
              className="group flex flex-col items-center gap-1 cursor-pointer"
              title={`Jump to Step ${s.stepNumber}: ${s.title}`}
            >
              <div className="h-2.5 w-8 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover:text-primary">
                0{s.stepNumber}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Animated Step List (200ms Fade & Slide-Up on tab change) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={guide.roleKey}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="space-y-4"
        >
          {guide.steps.map((step, index) => (
            <StepCard
              key={step.stepNumber}
              step={step}
              roleKey={guide.roleKey}
              isEven={index % 2 === 1}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
