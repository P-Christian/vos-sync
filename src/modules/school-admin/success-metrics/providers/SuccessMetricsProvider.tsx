// src/modules/school-admin/success-metrics/providers/SuccessMetricsProvider.tsx
'use client';

import React, { createContext, useContext } from 'react';
import { useSuccessMetrics } from '../hooks/useSuccessMetrics';
import { useAiPlacementInsights } from '../hooks/useAiPlacementInsights';
import {
  SuccessMetricsFilter,
  SuccessMetricsResponse,
  AiMetricsInsightResponse,
} from '../types/success-metrics.types';

interface SuccessMetricsContextValue {
  data: SuccessMetricsResponse | null;
  isLoading: boolean;
  error: string | null;
  filter: SuccessMetricsFilter;
  updateFilter: (newFilter: Partial<SuccessMetricsFilter>) => void;
  refresh: () => void;
  // AI Insights slice
  insight: AiMetricsInsightResponse | null;
  isGeneratingAi: boolean;
  aiError: string | null;
  generateAiInsights: () => Promise<void>;
}

const SuccessMetricsContext = createContext<SuccessMetricsContextValue | null>(null);

export function SuccessMetricsProvider({
  schoolId,
  schoolName,
  children,
}: {
  schoolId: number;
  schoolName?: string;
  children: React.ReactNode;
}) {
  const metricsHook = useSuccessMetrics({ school_id: schoolId });
  const aiHook = useAiPlacementInsights(schoolName);

  const handleGenerateAi = async () => {
    if (metricsHook.data) {
      await aiHook.generateInsights(metricsHook.data);
    }
  };

  return (
    <SuccessMetricsContext.Provider
      value={{
        data: metricsHook.data,
        isLoading: metricsHook.isLoading,
        error: metricsHook.error,
        filter: metricsHook.filter,
        updateFilter: metricsHook.updateFilter,
        refresh: metricsHook.refresh,
        insight: aiHook.insight,
        isGeneratingAi: aiHook.isGenerating,
        aiError: aiHook.error,
        generateAiInsights: handleGenerateAi,
      }}
    >
      {children}
    </SuccessMetricsContext.Provider>
  );
}

export function useSuccessMetricsContext() {
  const context = useContext(SuccessMetricsContext);
  if (!context) {
    throw new Error('useSuccessMetricsContext must be used within a SuccessMetricsProvider');
  }
  return context;
}
