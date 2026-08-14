// src/modules/public/company-profile/components/CompanyBrowseSkeleton.tsx
"use client";

import React from "react";

export function CompanyBrowseSkeleton() {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start shadow-xs relative overflow-hidden animate-pulse">
      {/* Brand logo container skeleton */}
      <div className="w-16 h-16 rounded-2xl bg-muted/70 shrink-0" />

      <div className="flex-1 min-w-0 w-full space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-5 bg-muted/80 rounded-md w-1/3" />
            <div className="h-4 bg-muted/60 rounded-full w-20" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-3 bg-muted/50 rounded-md w-24" />
            <div className="h-3 bg-muted/50 rounded-md w-24" />
            <div className="h-3 bg-muted/50 rounded-md w-28" />
          </div>
        </div>

        {/* Description Skeleton */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3 bg-muted/50 rounded-md w-full" />
          <div className="h-3 bg-muted/50 rounded-md w-4/5" />
        </div>

        {/* Action Button Skeleton */}
        <div className="pt-3 flex items-center justify-between border-t border-border/50">
          <div className="h-5 w-28 bg-muted/60 rounded-md" />
          <div className="h-9 w-32 bg-muted/70 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
