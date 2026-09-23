// src/modules/school-admin/job-referrals/providers/JobReferralsProvider.tsx
"use client";

import React, { createContext, useContext } from 'react';
import { useJobReferrals, UseJobReferralsReturn } from '../hooks/useJobReferrals';

const JobReferralsContext = createContext<UseJobReferralsReturn | null>(null);

export function JobReferralsProvider({ children }: { children: React.ReactNode }) {
  const referralState = useJobReferrals();

  return (
    <JobReferralsContext.Provider value={referralState}>
      {children}
    </JobReferralsContext.Provider>
  );
}

export function useJobReferralsContext(): UseJobReferralsReturn {
  const ctx = useContext(JobReferralsContext);
  if (!ctx) {
    throw new Error('useJobReferralsContext must be used within a JobReferralsProvider');
  }
  return ctx;
}
