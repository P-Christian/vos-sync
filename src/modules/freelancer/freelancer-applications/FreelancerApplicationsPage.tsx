"use client";

import React, { useEffect } from 'react';
import { useFreelancerApplications } from './hooks/useFreelancerApplications';
import { ApplicationHeader } from './components/ApplicationHeader';
import { ApplicationSummaryCards } from './components/ApplicationSummaryCards';
import { ApplicationTable } from './components/ApplicationTable';
import { ApplicationTips } from './components/ApplicationTips';
import { AIPromotionCard } from './components/AIPromotionCard';

const FreelancerApplicationsPage: React.FC = () => {
  const {
    applications,
    summary,
    loading,
    error,
    fetchApplications,
  } = useFreelancerApplications();

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return (
    <div className="w-full p-6 sm:p-8">
      <ApplicationHeader />
      <ApplicationSummaryCards summary={summary} />

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 bg-card rounded-xl border shadow-sm mb-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-zinc-400 animate-pulse">Loading applications...</span>
        </div>
      ) : (
        <ApplicationTable applications={applications} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <ApplicationTips />
        </div>
        <div className="md:col-span-1">
          <AIPromotionCard />
        </div>
      </div>
    </div>
  );
};

export default FreelancerApplicationsPage;
