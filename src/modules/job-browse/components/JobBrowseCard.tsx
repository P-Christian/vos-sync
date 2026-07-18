"use client";

import React from "react";
import { MapPin, Briefcase, Clock, Building2, ChevronRight, Wifi, Users, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicJobPosting, JOB_TYPE_LABELS } from "../types";

interface Props {
  job: PublicJobPosting;
  onViewDetail: (job: PublicJobPosting) => void;
  isBookmarked: boolean;
  onToggleBookmark: (jobId: number) => void;
}

function formatSalary(job: PublicJobPosting): string {
  if (job.salary_negotiable) return "Negotiable";
  const currency = job.currency ?? "PHP";
  if (job.salary_type === "Fixed Salary" && job.salary_min) {
    return `${currency} ${Number(job.salary_min).toLocaleString()}`;
  }
  if (job.salary_min && job.salary_max) {
    return `${currency} ${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()}`;
  }
  if (job.salary_min) {
    return `${currency} ${Number(job.salary_min).toLocaleString()}+`;
  }
  return "Salary not disclosed";
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const arrangementIcon: Record<string, React.ElementType> = {
  Remote: Wifi,
  Hybrid: Users,
  "On-site": Building2,
};

function getImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return `/api/client/assets/${value}`;
}

export function JobBrowseCard({ job, onViewDetail, isBookmarked, onToggleBookmark }: Props) {
  const ArrangeIcon = arrangementIcon[job.work_arrangement] ?? Briefcase;

  return (
    <div
      className="group bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer flex flex-col gap-4"
      onClick={() => onViewDetail(job)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onViewDetail(job)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Company Avatar */}
        <div className="w-11 h-11 rounded-xl border bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0 overflow-hidden">
          {job.company_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(job.company_logo)} alt={job.company_name ?? ""} className="w-full h-full object-cover" />
          ) : (
            getInitials(job.company_name)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {job.job_title}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {job.company_name ?? "—"}
          </p>
        </div>

        {timeAgo(job.created_at) && (
          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
            {timeAgo(job.created_at)}
          </span>
        )}
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          <MapPin className="h-3 w-3" />
          {job.job_location}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          <Briefcase className="h-3 w-3" />
          {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          <ArrangeIcon className="h-3 w-3" />
          {job.work_arrangement}
        </span>
        {job.number_of_openings > 1 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
            <Users className="h-3 w-3" />
            {job.number_of_openings} openings
          </span>
        )}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((s) => (
            <Badge key={s.id} variant="secondary" className="text-[10px] px-2 py-0 h-5 rounded-full font-normal">
              {s.skill_name}
            </Badge>
          ))}
          {job.skills.length > 4 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 rounded-full font-normal text-muted-foreground">
              +{job.skills.length - 4} more
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-medium text-foreground">{formatSalary(job)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 rounded-lg text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(job.job_id); }}
            title={isBookmarked ? "Remove Bookmark" : "Save Job"}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-lg px-2"
            onClick={(e) => { e.stopPropagation(); onViewDetail(job); }}
          >
            View <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
