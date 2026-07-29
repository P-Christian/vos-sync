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
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      gradient: "from-blue-500/5 to-indigo-500/5",
    },
    {
      title: "Total Applicants",
      value: stats.totalApplicants,
      subtitle: "+12 this week",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      gradient: "from-emerald-500/5 to-teal-500/5",
    },
    {
      title: "Pending Interviews",
      value: stats.pendingInterviews,
      subtitle: "Next 7 days",
      icon: Calendar,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      gradient: "from-amber-500/5 to-orange-500/5",
    },
    {
      title: "Hired Candidates",
      value: stats.hiredCount,
      subtitle: "All-time records",
      icon: Award,
      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      gradient: "from-purple-500/5 to-indigo-500/5",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            className="group relative overflow-hidden border bg-card shadow-2xs hover:shadow-md transition-all duration-300 rounded-2xl"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <CardContent className="p-6 relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.title}</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground font-mono">
                  {item.value}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">{item.subtitle}</p>
              </div>

              <div className={`p-3 rounded-xl border ${item.color} shrink-0 shadow-xs`}>
                <Icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
