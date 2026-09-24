// src/modules/school-admin/success-metrics/hooks/useSuccessMetrics.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SuccessMetricsFilter,
  SuccessMetricsResponse,
} from '../types/success-metrics.types';

export function useSuccessMetrics(initialFilter: SuccessMetricsFilter) {
  const [filter, setFilter] = useState<SuccessMetricsFilter>(initialFilter);
  const [data, setData] = useState<SuccessMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (currentFilter: SuccessMetricsFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('school_id', String(currentFilter.school_id));
      if (currentFilter.school_year && currentFilter.school_year !== 'ALL') {
        params.set('school_year', currentFilter.school_year);
      }
      if (currentFilter.school_course_id && currentFilter.school_course_id !== 'ALL') {
        params.set('school_course_id', String(currentFilter.school_course_id));
      }
      if (currentFilter.is_alumni !== undefined && currentFilter.is_alumni !== 'ALL') {
        params.set('is_alumni', String(currentFilter.is_alumni));
      }

      const res = await fetch(`/api/school-admin/success-metrics?${params.toString()}`);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Failed to load metrics (${res.status})`);
      }

      const json = await res.json();
      setData(json.data || json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('school_id', String(filter.school_id));
        if (filter.school_year && filter.school_year !== 'ALL') {
          params.set('school_year', filter.school_year);
        }
        if (filter.school_course_id && filter.school_course_id !== 'ALL') {
          params.set('school_course_id', String(filter.school_course_id));
        }
        if (filter.is_alumni !== undefined && filter.is_alumni !== 'ALL') {
          params.set('is_alumni', String(filter.is_alumni));
        }

        const res = await fetch(`/api/school-admin/success-metrics?${params.toString()}`);
        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson.message || `Failed to load metrics (${res.status})`);
        }

        const json = await res.json();
        if (!isCancelled) {
          setData(json.data || json);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : 'An unexpected error occurred';
          setError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [filter]);

  const updateFilter = useCallback((newFilter: Partial<SuccessMetricsFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const refresh = useCallback(() => {
    fetchMetrics(filter);
  }, [filter, fetchMetrics]);

  return {
    data,
    isLoading,
    error,
    filter,
    updateFilter,
    refresh,
  };
}
