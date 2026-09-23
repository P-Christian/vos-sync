// src/modules/school-admin/job-referrals/components/JobReferralCard.tsx
"use client";

import React from 'react';
import { VsJobPosting } from '../types/job-referrals.types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  MapPin,
  Building2,
  Users,
  Send,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { formatSalary } from '../services/job-referrals.helpers';

interface JobReferralCardProps {
  job: VsJobPosting;
  onRefer: (job: VsJobPosting) => void;
}

export function JobReferralCard({ job, onRefer }: JobReferralCardProps) {
  const formatJobType = (t: string) => t.replace('_', ' ');

  return (
    <Card className="hover:border-primary/50 transition-all duration-200 hover:shadow-md border-border/80 bg-card">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Header / Company / Category */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                <Building2 className="w-3.5 h-3.5" />
                {job.company_name || 'VOS Partner Company'}
              </span>
              <Badge variant="outline" className="text-xs font-medium">
                {job.job_category}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50"
              >
                {formatJobType(job.job_type)}
              </Badge>
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                {job.work_arrangement}
              </Badge>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1">
                {job.job_title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {job.job_description}
              </p>
            </div>

            {/* Key Metadata Pills */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{job.job_location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>
                  {formatSalary(job.salary_min, job.salary_max, job.currency)}
                  {job.salary_type ? ` • ${job.salary_type}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{job.number_of_openings} {job.number_of_openings === 1 ? 'Opening' : 'Openings'}</span>
              </div>
              {job.education && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="line-clamp-1 max-w-[200px]">{job.education}</span>
                </div>
              )}
            </div>

            {/* Qualifications Preview */}
            {job.job_qualifications && (
              <div className="bg-muted/40 rounded-lg p-2.5 border border-muted text-xs text-muted-foreground line-clamp-2">
                <span className="font-semibold text-foreground/80 mr-1">Qualifications:</span>
                {job.job_qualifications}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row md:flex-col items-end justify-between gap-3 shrink-0">
            <Button
              onClick={() => onRefer(job)}
              className="w-full sm:w-auto md:w-full gap-2 shadow-sm font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <Send className="w-4 h-4" />
              Refer Students
            </Button>
            <span className="text-[11px] text-muted-foreground/80 self-center md:self-end">
              Verified candidates only
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
