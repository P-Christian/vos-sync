import React from "react";
import { Users, GraduationCap, Award, AlertCircle } from "lucide-react";
import { SchoolWithStats } from "../types/school-admin.types";
import { SuccessMetricsResponse } from "../success-metrics/types/success-metrics.types";
import { SchoolOverviewBanner } from "./dashboard/SchoolOverviewBanner";
import { SchoolMetricCard } from "./dashboard/SchoolMetricCard";
import { StudentEnrollmentVelocityChart } from "./dashboard/StudentEnrollmentVelocityChart";
import { CourseDistributionChart } from "./dashboard/CourseDistributionChart";
import { StudentPipelineSplitChart } from "./dashboard/StudentPipelineSplitChart";
import { SchoolActionHighlights } from "./dashboard/SchoolActionHighlights";

interface SchoolAdminDashboardProps {
  school: SchoolWithStats;
  metrics?: SuccessMetricsResponse | null;
  metricsLoading?: boolean;
}

export function SchoolAdminDashboard({
  school,
  metrics,
}: SchoolAdminDashboardProps) {
  const isDraft = school.school_status === "Draft" || school.verification_status === "DRAFT";
  const studentCount = school.student_count || 0;
  const courseCount = school.course_count || 0;

  // Real values calculated directly from database records
  const placementRate = metrics?.kpis?.placementRate !== undefined
    ? `${metrics.kpis.placementRate}%`
    : "0.0%";
  const hiredCount = metrics?.kpis?.hiredCount || 0;
  const activePipelineCount = metrics?.kpis?.activePipelineCount || 0;
  const topCourse = metrics?.kpis?.topPerformingCourse;

  return (
    <div className="space-y-6">
      {/* 1. Executive Institution Hero Banner */}
      <SchoolOverviewBanner school={school} />

      {/* Draft Notification Alert if institution pending review */}
      {isDraft && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold">Account Pending Verification</h4>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Your school profile is currently being reviewed by the VOS-Sync verification team. Complete your school documents and details to accelerate activation.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Metric Cards with Top-side only Color Accents & Zero False Data */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SchoolMetricCard
          title="Active Student Roster"
          value={studentCount}
          subtitle="Enrolled candidates in institution portal"
          badgeText={studentCount > 0 ? "Roster Active" : "No Roster"}
          badgeTrend={studentCount > 0 ? "up" : "neutral"}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-500/10 border-blue-500/20"
          topAccentColor="border-t-blue-500"
        />

        <SchoolMetricCard
          title="Accredited Academic Courses"
          value={courseCount}
          subtitle={topCourse ? `Top Program: ${topCourse}` : "Active degree programs and majors"}
          badgeText={courseCount > 0 ? "Accredited" : "Pending Setup"}
          badgeTrend={courseCount > 0 ? "neutral" : "down"}
          icon={GraduationCap}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-500/10 border-indigo-500/20"
          topAccentColor="border-t-indigo-500"
        />

        <SchoolMetricCard
          title="Career Placement Rate"
          value={placementRate}
          subtitle={`${hiredCount} hired, ${activePipelineCount} active in interview pipeline`}
          badgeText={hiredCount > 0 ? `${hiredCount} Hired` : "0 Hires"}
          badgeTrend={hiredCount > 0 ? "up" : "neutral"}
          icon={Award}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-500/10 border-emerald-500/20"
          topAccentColor="border-t-emerald-500"
        />
      </div>

      {/* 3. Visual Charts Grid (Area Chart + Bar Distribution + Pipeline Donut) with Real Data */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
        <div className="lg:col-span-1 h-full">
          <StudentEnrollmentVelocityChart
            totalStudents={studentCount}
            totalHired={hiredCount}
          />
        </div>
        <div className="lg:col-span-1 h-full">
          <CourseDistributionChart
            courseStats={metrics?.courseStats || []}
          />
        </div>
        <div className="lg:col-span-1 h-full">
          <StudentPipelineSplitChart
            totalStudents={studentCount}
            funnelStages={metrics?.funnelStages || []}
          />
        </div>
      </div>

      {/* 4. Action Highlights & Program Shortcuts */}
      <SchoolActionHighlights />
    </div>
  );
}
