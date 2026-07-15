// src/modules/client/applicants/components/ApplicantCard.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Briefcase, Clock, CalendarPlus } from "lucide-react";
import { Applicant, ApplicationStatus, STATUS_LABELS } from "../types";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  APPLIED: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  SHORTLISTED: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  INTERVIEW_SCHEDULED: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  HIRED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface ApplicantCardProps {
  applicant: Applicant;
  onUpdateStatus: (applicant: Applicant) => void;
  onScheduleInterview: (applicant: Applicant) => void;
}

export default function ApplicantCard({ applicant, onUpdateStatus, onScheduleInterview }: ApplicantCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                {applicant.applicant_name ?? `Applicant #${applicant.application_id}`}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[applicant.application_status]}`}
              >
                {STATUS_LABELS[applicant.application_status]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {applicant.applicant_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {applicant.applicant_email}
                </span>
              )}
              {applicant.job_title && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {applicant.job_title}
                </span>
              )}
              {applicant.experience && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {applicant.experience}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Applied {timeAgo(applicant.applied_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(applicant)}
              className="h-8 px-3 text-xs rounded-lg"
            >
              Update Status
            </Button>
            {applicant.application_status !== "REJECTED" && applicant.application_status !== "HIRED" && (
              <Button
                size="sm"
                onClick={() => onScheduleInterview(applicant)}
                className="h-8 px-3 text-xs rounded-lg gap-1 bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Schedule Interview
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

