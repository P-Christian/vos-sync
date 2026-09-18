// src/modules/client/dashboard/DashboardModule.tsx
"use client";

import React, { useState, useEffect } from "react";
import DashboardHeader from "./components/DashboardHeader";
import KpiSummaryGrid from "./components/KpiSummaryGrid";
import HiringOverviewChart from "./components/HiringOverviewChart";
import JobPerformanceTable from "./components/JobPerformanceTable";
import RecentApplicantsCard from "./components/RecentApplicantsCard";
import UpcomingInterviewsCard from "./components/UpcomingInterviewsCard";
import ActionRequiredCard from "./components/ActionRequiredCard";
import DashboardSkeleton from "./components/DashboardSkeleton";
import { DashboardData, CompanyInfo } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface DashboardModuleProps {
  userName?: string;
}

export default function DashboardModule({ userName }: DashboardModuleProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/client/dashboard");
        if (!response.ok) {
          throw new Error("Failed to load dashboard metrics.");
        }
        const json: DashboardData = await response.json();
        if (json.onboardingRequired) {
          router.push("/vos-sync/client/company-profile");
          return;
        }
        if (isMounted) {
          setData(json);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "An error occurred fetching dashboard data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <Card className="border-destructive/30 shadow-md">
          <CardContent className="p-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Sync Failure</h3>
            <p className="text-sm text-muted-foreground">
              {error || "Could not retrieve company profile information."}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full max-md:min-h-10 flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = data.company ?? ({} as CompanyInfo);
  const stats = data.stats ?? {
    activeJobs: 0,
    hiredCount: 0,
    upcomingInterviewsCount: 0,
    totalApplicants: 0,
    totalJobs: 0,
    shortlistedCount: 0,
  };
  const jobPerformance = data.jobPerformance ?? data.recentJobs ?? [];
  const recentApplicants = data.recentApplicants ?? [];
  const upcomingInterviews = data.upcomingInterviews ?? [];
  const actionsRequired = data.actionsRequired ?? [];
  const chartData = data.chartData;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 md:space-y-6 pb-14"
    >
      {/* 1. Header / Greeting with Post a Job CTA */}
      <DashboardHeader company={company} userName={userName} />

      {/* 2. KPI Summary 4-card Grid */}
      <KpiSummaryGrid stats={stats} />

      {/* 3. Content Sections
          - Mobile: Action Required first, then a switcher, then the selected section only.
          - Desktop (md+): no order applied -> the original layout renders unchanged
            (Hiring Overview full width, Job Performance | Upcoming Interviews,
            Recent Applicants | Action Required). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-stretch">
        {/* Mobile-only switcher for the four content sections */}
        <div className="md:hidden max-md:order-2 flex items-center gap-1 rounded-xl border bg-card p-1">
          {["Hiring Overview", "Job Performance", "Upcoming Interviews", "Recent Applicants"].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveSection(i)}
              className={`flex-1 min-h-10 rounded-lg px-2 py-1 text-[11px] leading-tight text-center font-medium transition-colors ${activeSection === i ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={`max-md:order-3 lg:col-span-2${activeSection === 0 ? "" : " max-md:hidden"}`}>
          <HiringOverviewChart chartData={chartData} />
        </div>
        <div className={`max-md:order-3${activeSection === 1 ? "" : " max-md:hidden"}`}>
          <JobPerformanceTable jobs={jobPerformance} />
        </div>
        <div className={`max-md:order-3${activeSection === 2 ? "" : " max-md:hidden"}`}>
          <UpcomingInterviewsCard interviews={upcomingInterviews} />
        </div>
        <div className={`max-md:order-3${activeSection === 3 ? "" : " max-md:hidden"}`}>
          <RecentApplicantsCard applicants={recentApplicants} />
        </div>
        {/* Action Required: pulled to the top on mobile only; on desktop it keeps its
            original half-width cell beside Recent Applicants. */}
        <div className="max-md:order-1">
          <ActionRequiredCard initialActions={actionsRequired} />
        </div>
      </div>
    </motion.div>
  );
}
