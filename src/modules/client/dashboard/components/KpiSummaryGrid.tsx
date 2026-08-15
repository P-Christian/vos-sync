// src/modules/client/dashboard/components/KpiSummaryGrid.tsx
"use client";

import React, { useCallback } from "react";
import { DashboardStats } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Users, UserCheck, Calendar, ArrowUpRight, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface KpiSummaryGridProps {
  stats: DashboardStats;
}

export default function KpiSummaryGrid({ stats }: KpiSummaryGridProps) {
  const router = useRouter();

  const handleNavigate = useCallback((url: string) => {
    router.push(url);
  }, [router]);

  const cards = [
    {
      title: "Active Jobs",
      value: stats.activeJobs ?? 0,
      deltaText: stats.activeJobsDelta || "Active listings",
      icon: Briefcase,
      route: "/vos-sync/client/jobs",
    },
    {
      title: "Total Applicants",
      value: stats.totalApplicants ?? 0,
      deltaText:
        stats.applicantsGrowthPercent !== undefined
          ? stats.applicantsGrowthPercent >= 0
            ? `↑ ${stats.applicantsGrowthPercent}% this month`
            : `↓ ${Math.abs(stats.applicantsGrowthPercent)}% this month`
          : "Steady intake",
      icon: Users,
      route: "/vos-sync/client/applicants",
    },
    {
      title: "Shortlisted Candidates",
      value: stats.shortlistedCount ?? 0,
      deltaText: stats.shortlistedWeeklyGrowth || "In review pipeline",
      icon: UserCheck,
      route: "/vos-sync/client/applicants?status=SHORTLISTED",
    },
    {
      title: "Upcoming Interviews",
      value: stats.upcomingInterviewsCount ?? 0,
      deltaText: stats.nextInterviewSummary || "Scheduled sessions",
      icon: Calendar,
      route: "/vos-sync/client/interviews",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => handleNavigate(card.route)}
            className="cursor-pointer group"
          >
            <Card className="border bg-card shadow-2xs hover:shadow-md transition-all duration-200 group-hover:border-primary/40 rounded-2xl overflow-hidden relative">
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {card.title}
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-center">
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-between">
                    <span>{card.value}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground pt-0.5">
                    <span>{card.deltaText}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity border-t border-border/50">
                  <span>View details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
