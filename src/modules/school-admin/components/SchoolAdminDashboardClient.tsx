// src/modules/school-admin/components/SchoolAdminDashboardClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSchoolAdmin } from '@/modules/school-admin/hooks/useSchoolAdmin';
import { SchoolAdminDashboard } from '@/modules/school-admin/components/SchoolAdminDashboard';
import { DashboardSkeleton } from '@/modules/school-admin/components/SchoolAdminSkeleton';
import { SuccessMetricsResponse } from '../success-metrics/types/success-metrics.types';

export function SchoolAdminDashboardClient() {
  const { school, loading, fetchMySchool } = useSchoolAdmin();
  const [metrics, setMetrics] = useState<SuccessMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    fetchMySchool();
  }, [fetchMySchool]);

  useEffect(() => {
    if (!school?.school_id) return;

    let isMounted = true;

    const loadMetrics = async () => {
      setMetricsLoading(true);
      try {
        const res = await fetch(`/api/school-admin/success-metrics?school_id=${school.school_id}`);
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const json = await res.json();
        if (isMounted && json?.data) {
          setMetrics(json.data);
        }
      } catch (err) {
        console.warn('[Dashboard] Could not load success metrics:', err);
      } finally {
        if (isMounted) setMetricsLoading(false);
      }
    };

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, [school?.school_id]);

  if (loading || !school) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <SchoolAdminDashboard
        school={school}
        metrics={metrics}
        metricsLoading={metricsLoading}
      />
    </div>
  );
}
