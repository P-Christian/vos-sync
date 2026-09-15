// src/modules/school-admin/school-profile/components/SchoolMetricsWidget.tsx
"use client";

import React from "react";
import { BookOpen, Users } from "lucide-react";

interface SchoolMetricsWidgetProps {
  courseCount?: number;
  studentCount?: number;
  schoolType?: string;
}

export default function SchoolMetricsWidget({
  courseCount = 0,
  studentCount = 0,
}: SchoolMetricsWidgetProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5 transition-colors hover:border-primary/40">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
            Courses
          </p>
          <p className="text-lg font-black text-foreground tracking-tight">
            {courseCount}
          </p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5 transition-colors hover:border-primary/40">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
            Students
          </p>
          <p className="text-lg font-black text-foreground tracking-tight">
            {studentCount}
          </p>
        </div>
      </div>
    </div>
  );
}
