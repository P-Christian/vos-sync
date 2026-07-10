// src/modules/client/dashboard/components/KpiCards.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardStats } from "../types";
import { Briefcase, Users, Calendar, Award } from "lucide-react";

interface KpiCardsProps {
  stats: DashboardStats;
}

export default function KpiCards({ stats }: KpiCardsProps) {
  const items = [
    {
      title: "Active Job Posts",
      value: stats.activeJobs,
      subtitle: `${stats.totalJobs} total postings`,
      icon: Briefcase,
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30",
      gradient: "from-blue-500/10 to-indigo-500/5",
    },
    {
      title: "Total Applicants",
      value: stats.totalApplicants,
      subtitle: "+12 this week",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30",
      gradient: "from-emerald-500/10 to-teal-500/5",
    },
    {
      title: "Pending Interviews",
      value: stats.pendingInterviews,
      subtitle: "Next 7 days",
      icon: Calendar,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30",
      gradient: "from-amber-500/10 to-orange-500/5",
    },
    {
      title: "Hired Candidates",
      value: stats.hiredCount,
      subtitle: "All-time records",
      icon: Award,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30",
      gradient: "from-indigo-500/10 to-purple-500/5",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            className="group relative overflow-hidden border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md rounded-xl"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <CardContent className="p-6 relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{item.title}</p>
                <h3 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {item.value}
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{item.subtitle}</p>
              </div>

              <div className={`p-3 rounded-2xl border ${item.color} shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

