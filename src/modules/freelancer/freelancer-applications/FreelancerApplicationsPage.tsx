"use client";

import React from 'react';
import { ApplicationHeader } from './components/ApplicationHeader';
import { ApplicationSummaryCards } from './components/ApplicationSummaryCards';
import { ApplicationTable } from './components/ApplicationTable';
import { ApplicationTips } from './components/ApplicationTips';
import { AIPromotionCard } from './components/AIPromotionCard';
import { summaryData, applicationsData } from './mockData';

const FreelancerApplicationsPage: React.FC = () => {
  return (
    <div className="w-full p-6 sm:p-8">
      <ApplicationHeader />
      <ApplicationSummaryCards summary={summaryData} />
      <ApplicationTable applications={applicationsData} />

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
