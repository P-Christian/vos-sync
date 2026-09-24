// src/modules/school-admin/success-metrics/SuccessMetricsPage.tsx
'use client';

import React from 'react';
import { SuccessMetricsProvider, useSuccessMetricsContext } from './providers/SuccessMetricsProvider';
import { MetricsKpiCards } from './components/MetricsKpiCards';
import { PlacementFunnelChart } from './components/PlacementFunnelChart';
import { CourseComparisonChart } from './components/CourseComparisonChart';
import { TopHiringCompaniesTable } from './components/TopHiringCompaniesTable';
import { AiPlacementInsightsCard } from './components/AiPlacementInsightsCard';
import { MetricsFiltersBar } from './components/MetricsFiltersBar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, GraduationCap } from 'lucide-react';

function SuccessMetricsContent() {
  const { data, isLoading, error } = useSuccessMetricsContext();

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-lg" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-12 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <h3 className="text-lg font-semibold text-foreground">Failed to load success metrics</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Graduate Placement & Success Metrics</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track student employment velocity, recruitment pipelines, and hiring outcomes across academic programs.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <MetricsKpiCards kpis={data.kpis} />

      {/* Filters Bar */}
      <MetricsFiltersBar />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlacementFunnelChart funnelStages={data.funnelStages} />
        <CourseComparisonChart courseStats={data.courseStats} />
      </div>

      {/* Top Hiring Companies & AI Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TopHiringCompaniesTable topCompanies={data.topCompanies} />
        </div>
        <div className="lg:col-span-2">
          <AiPlacementInsightsCard />
        </div>
      </div>
    </div>
  );
}

interface SuccessMetricsPageProps {
  initialSchoolId?: number;
  initialSchoolName?: string;
}

export function SuccessMetricsPage({
  initialSchoolId = 1,
  initialSchoolName = 'Institution',
}: SuccessMetricsPageProps) {
  return (
    <SuccessMetricsProvider schoolId={initialSchoolId} schoolName={initialSchoolName}>
      <SuccessMetricsContent />
    </SuccessMetricsProvider>
  );
}
