// src/modules/client/company-profile/components/CompanyCompletionBar.tsx
"use client";

import React from "react";

interface CompanyCompletionBarProps {
  percent: number;
}

export default function CompanyCompletionBar({ percent }: CompanyCompletionBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  const colorClass =
    clamped >= 80
      ? "bg-emerald-500"
      : clamped >= 50
      ? "bg-amber-500"
      : "bg-rose-500";

  const textColorClass =
    clamped >= 80
      ? "text-emerald-700 dark:text-emerald-400"
      : clamped >= 50
      ? "text-amber-700 dark:text-amber-400"
      : "text-rose-700 dark:text-rose-400";

  const bgTrackClass =
    clamped >= 80
      ? "bg-emerald-100 dark:bg-emerald-950/40"
      : clamped >= 50
      ? "bg-amber-100 dark:bg-amber-950/40"
      : "bg-rose-100 dark:bg-rose-950/40";

  const label =
    clamped >= 80
      ? "Almost ready to submit!"
      : clamped >= 50
      ? "Keep going — complete more sections."
      : "Your profile is incomplete.";

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Profile Completion
          </span>
          <span className={`text-xs font-bold tabular-nums ${textColorClass}`}>
            {clamped}%
          </span>
        </div>
        <div className={`h-2 w-full rounded-full overflow-hidden ${bgTrackClass}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className={`text-[11px] font-medium ${textColorClass}`}>{label}</p>
      </div>
    </div>
  );
}
