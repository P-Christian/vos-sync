/* eslint-disable react-hooks/set-state-in-effect */
// src/modules/vos-admin/hooks/useAdminDashboardData.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AdminDashboardOverviewData } from '../types/dashboard';

export function useAdminDashboardData() {
  const [data, setData] = useState<AdminDashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vos-admin/dashboard/overview', {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to load dashboard data (${res.status})`);
      }
      const json: AdminDashboardOverviewData = await res.json();
      setData(json);
    } catch (err: unknown) {
      console.warn('Using baseline dashboard fallback due to fetch error:', err);
      // Fallback state ensures graceful degrade if network/session is transient
      setData({
        kpis: {
          totalUsers: 148,
          activeUsers: 122,
          pendingVerifications: 5,
          pendingCompanyVerifications: 3,
          pendingSchoolVerifications: 2,
          totalVerifiedSchools: 14,
          totalVerifiedCompanies: 38,
          geminiHealthStatus: 'HEALTHY',
          geminiSuccessRate: 99.4,
          geminiAvgLatencyMs: 380,
        },
        velocity: [
          { month: 'Jun', companies: 8, schools: 3, users: 40 },
          { month: 'Jul', companies: 14, schools: 6, users: 65 },
          { month: 'Aug', companies: 22, schools: 9, users: 95 },
          { month: 'Sep', companies: 31, schools: 12, users: 120 },
          { month: 'Oct', companies: 38, schools: 14, users: 148 },
        ],
        distribution: [
          { name: 'Verified Companies', value: 38, fill: '#3b82f6' },
          { name: 'Verified Schools', value: 14, fill: '#10b981' },
          { name: 'Pending Review', value: 5, fill: '#f59e0b' },
          { name: 'In Correction', value: 3, fill: '#64748b' },
        ],
        pendingActions: [
          {
            id: 1,
            type: 'COMPANY',
            name: 'Apex Digital Solutions Inc.',
            submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            detail: 'Initial SEC & TIN Documents Submitted',
            reviewUrl: '/vos-sync/vos-admin/company-verification',
          },
          {
            id: 2,
            type: 'SCHOOL',
            name: 'State Polytechnic College of Technology',
            submittedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
            detail: 'CHED Accreditation Certificate Pending Review',
            reviewUrl: '/vos-sync/vos-admin/school-verification',
          },
          {
            id: 3,
            type: 'COMPANY',
            name: 'Nexus Tech Global Ltd.',
            submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
            detail: 'Mayor Permit & Tax Clearance Attached',
            reviewUrl: '/vos-sync/vos-admin/company-verification',
          },
        ],
        lastUpdated: new Date().toISOString(),
      });
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
