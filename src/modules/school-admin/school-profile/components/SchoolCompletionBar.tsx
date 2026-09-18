// src/modules/school-admin/school-profile/components/SchoolCompletionBar.tsx
"use client";

import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

interface SchoolCompletionBarProps {
  percent?: number;
}

export default function SchoolCompletionBar({ percent = 0 }: SchoolCompletionBarProps) {
  const rounded = Math.min(100, Math.max(0, Math.round(percent)));

  const getStatusText = (val: number) => {
    if (val >= 100) return "Profile fully completed";
    if (val >= 80) return "Almost ready for full verification";
    if (val >= 50) return "Good progress! Keep completing details";
    return "Complete profile details for better visibility";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {rounded >= 100 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Profile Completion
          </span>
        </div>
        <span className="text-sm font-extrabold text-primary font-mono">
          {rounded}%
        </span>
      </div>

      <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${rounded}%` }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {getStatusText(rounded)}
      </p>
    </div>
  );
}
