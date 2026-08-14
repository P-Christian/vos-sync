// src/modules/public/find-jobs/components/PublicJobSkeleton.tsx
"use client";

import React from "react";

export function PublicJobSkeleton() {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-xs relative overflow-hidden animate-pulse">
      <div className="space-y-3">
        {/* Top Header: Logo + Title + Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-12 w-12 rounded-xl bg-muted/70 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-muted/60 rounded-md w-1/3" />
              <div className="h-4 bg-muted/80 rounded-md w-2/3" />
            </div>
          </div>
          <div className="h-5 w-16 bg-muted/60 rounded-full shrink-0" />
        </div>

        {/* Job Description Snippet Skeleton */}
        <div className="space-y-2 pt-1">
          <div className="h-3 bg-muted/50 rounded-md w-full" />
          <div className="h-3 bg-muted/50 rounded-md w-4/5" />
        </div>

        {/* Badges & Meta Skeleton */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-5 w-20 bg-muted/60 rounded-md" />
          <div className="h-4 w-28 bg-muted/40 rounded-md" />
        </div>
      </div>

      {/* Footer: Salary + CTA Button Skeleton */}
      <div className="pt-3 border-t flex items-center justify-between gap-2">
        <div className="space-y-1.5">
          <div className="h-4 bg-muted/70 rounded-md w-28" />
          <div className="h-3 bg-muted/40 rounded-md w-16" />
        </div>
        <div className="h-8 w-24 bg-muted/70 rounded-xl" />
      </div>
    </div>
  );
}
