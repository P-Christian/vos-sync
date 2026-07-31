// src/modules/public/how-it-works/components/QuickOverview.tsx
"use client";

import React from "react";
import { User, Building2, GraduationCap, Clock, ArrowRight } from "lucide-react";
import { RoleKey } from "../types";
import { ROLE_GUIDES } from "../config";

interface Props {
  activeRole: RoleKey;
  onSelectRole: (role: RoleKey) => void;
}

export function QuickOverview({ activeRole, onSelectRole }: Props) {
  const cards = [
    {
      key: "employee" as RoleKey,
      title: "Employee / Job Seeker",
      icon: <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      colorClass: "hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20",
      activeClass: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-md",
      guide: ROLE_GUIDES.employee,
    },
    {
      key: "employer" as RoleKey,
      title: "Employer / Company",
      icon: <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      colorClass: "hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20",
      activeClass: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md",
      guide: ROLE_GUIDES.employer,
    },
    {
      key: "school" as RoleKey,
      title: "School / Institution",
      icon: <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      colorClass: "hover:border-amber-500/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20",
      activeClass: "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md",
      guide: ROLE_GUIDES.school,
    },
  ];

  return (
    <div id="quick-overview-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Quick Overview & Role Summary
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const isActive = activeRole === card.key;
          return (
            <div
              key={card.key}
              onClick={() => onSelectRole(card.key)}
              className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer space-y-3 relative overflow-hidden bg-card ${
                isActive ? card.activeClass : card.colorClass
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl border bg-background shrink-0 shadow-2xs">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{card.title}</h3>
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {card.guide.totalOnboardingTime}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.guide.oneSentenceSummary}
              </p>

              <div className="pt-1 flex items-center justify-end">
                <span className={`text-xs font-bold flex items-center gap-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {isActive ? "Viewing Roadmap" : "View Roadmap"}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
