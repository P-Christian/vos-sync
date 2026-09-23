// src/modules/school-admin/job-referrals/components/JobReferralList.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useJobReferralsContext } from '../providers/JobReferralsProvider';
import { JobReferralCard } from './JobReferralCard';
import { Input } from '@/components/ui/input';
import {
  Search,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';

export function JobReferralList() {
  const { jobs, openReferralWizard, isLoading } = useJobReferralsContext();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [arrangementFilter, setArrangementFilter] = useState('ALL');

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchSearch =
        search.trim() === '' ||
        job.job_title.toLowerCase().includes(search.toLowerCase()) ||
        (job.company_name && job.company_name.toLowerCase().includes(search.toLowerCase())) ||
        job.job_category.toLowerCase().includes(search.toLowerCase()) ||
        job.job_description.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'ALL' || job.job_type === typeFilter;
      const matchArrangement = arrangementFilter === 'ALL' || job.work_arrangement === arrangementFilter;

      return matchSearch && matchType && matchArrangement;
    });
  }, [jobs, search, typeFilter, arrangementFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 rounded-xl border bg-card/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search active vacancies, companies, roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Job Type Filter */}
            <div className="flex items-center gap-1.5">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Job Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>

            {/* Work Arrangement Filter */}
            <div className="flex items-center gap-1.5">
              <select
                value={arrangementFilter}
                onChange={(e) => setArrangementFilter(e.target.value)}
                className="text-xs bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Work Setups</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            Showing <strong className="text-foreground">{filteredJobs.length}</strong> available vacancies
          </span>
          {(search || typeFilter !== 'ALL' || arrangementFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setArrangementFilter('ALL');
              }}
              className="text-primary hover:underline text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Jobs Roster Cards */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 space-y-3 rounded-xl border border-dashed border-border bg-card/30">
          <SlidersHorizontal className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No matching job vacancies</h3>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search terms or filter criteria.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredJobs.map((job) => (
            <JobReferralCard key={job.job_id} job={job} onRefer={openReferralWizard} />
          ))}
        </div>
      )}
    </div>
  );
}
