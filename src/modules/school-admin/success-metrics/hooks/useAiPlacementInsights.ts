// src/modules/school-admin/success-metrics/hooks/useAiPlacementInsights.ts
'use client';

import { useCallback, useState } from 'react';
import {
  AiMetricsInsightRequest,
  AiMetricsInsightResponse,
  SuccessMetricsResponse,
} from '../types/success-metrics.types';

export function useAiPlacementInsights(schoolName?: string) {
  const [insight, setInsight] = useState<AiMetricsInsightResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = useCallback(
    async (metricsData: SuccessMetricsResponse) => {
      setIsGenerating(true);
      setError(null);

      const requestPayload: AiMetricsInsightRequest = {
        schoolName: schoolName || 'Institution',
        totalStudents: metricsData.kpis.totalStudents,
        registeredStudents: metricsData.kpis.registeredStudents,
        hiredCount: metricsData.kpis.hiredCount,
        placementRate: metricsData.kpis.placementRate,
        activePipelineCount: metricsData.kpis.activePipelineCount,
        avgTimeToHireDays: metricsData.kpis.avgTimeToHireDays,
        topCourse: metricsData.kpis.topPerformingCourse,
        courseStatsSummary: metricsData.courseStats.map((c) => ({
          courseName: c.courseName,
          placementRate: c.placementRate,
          hiredCount: c.hiredCount,
        })),
        topCompaniesSummary: metricsData.topCompanies.map((c) => ({
          companyName: c.companyName,
          hiredCount: c.hiredCount,
        })),
      };

      try {
        const res = await fetch('/api/school-admin/success-metrics/ai-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson.message || 'Failed to generate AI insights');
        }

        const json = await res.json();
        setInsight(json.data || json);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error generating AI insights';
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [schoolName]
  );

  return {
    insight,
    isGenerating,
    error,
    generateInsights,
  };
}
