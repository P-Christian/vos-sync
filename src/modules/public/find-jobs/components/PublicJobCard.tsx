// src/modules/public/find-jobs/components/PublicJobCard.tsx
"use client";

import React from "react";
import { Building2, MapPin, Briefcase, DollarSign, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicJobPosting } from "../types";

interface Props {
  job: PublicJobPosting;
  onSelectJob: (job: PublicJobPosting) => void;
  onApplyClick: (job: PublicJobPosting) => void;
}

export function PublicJobCard({ job, onSelectJob, onApplyClick }: Props) {
  const formatSalary = (min?: number | null, max?: number | null, curr?: string) => {
    if (!min && !max) return "Competitive Salary";
    const currency = curr || "PHP";
    const formatter = new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 0 });
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `From ${formatter.format(min)}`;
    return `Up to ${formatter.format(max!)}`;
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return "Just posted";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    return "Recently posted";
  };

  return (
    <div
      onClick={() => onSelectJob(job)}
      className="group bg-card border rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
    >
      <div className="space-y-3">
        {/* Top Header: Logo + Title + Verified Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {job.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.company_logo_url}
                  alt={job.company_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-muted-foreground truncate max-w-[200px]">
                  {job.company_name}
                </span>
                {job.company_verification_status === "VERIFIED" && (
                  <span title="Verified Employer" className="inline-flex">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {job.job_title}
              </h3>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] uppercase font-semibold shrink-0 bg-muted/20">
            {job.work_setup}
          </Badge>
        </div>

        {/* Short Job Description Snippet */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {job.job_description}
        </p>

        {/* Pills & Meta info */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <Badge variant="secondary" className="text-[10px] font-semibold">
            <Briefcase className="h-3 w-3 mr-1" />
            {job.job_type}
          </Badge>

          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            {job.location}
          </span>
        </div>
      </div>

      {/* Footer: Salary + Posted Date + Action CTA */}
      <div className="pt-3 border-t flex items-center justify-between gap-2 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-foreground text-sm flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getTimeAgo(job.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onApplyClick(job);
            }}
            className="h-8 text-xs font-semibold gap-1"
          >
            Sign In to Apply
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
