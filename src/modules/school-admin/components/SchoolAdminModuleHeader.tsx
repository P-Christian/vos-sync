"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchoolAdminModuleHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function SchoolAdminModuleHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: SchoolAdminModuleHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-zinc-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden",
        className
      )}
    >
      <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 bg-white/10 backdrop-blur rounded-xl border border-white/20 shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{description}</p>
        </div>
      </div>
      {actions && (
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
