// src/modules/client/applicants/components/ApplicantCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Briefcase, Clock, CalendarPlus, ChevronRight, MessageSquare, FileText, CheckCircle2 } from "lucide-react";
import { Applicant, ApplicationStatus, STATUS_LABELS } from "../types";
import { getApplicantAvatarUrl, getInitials, timeAgo } from "../utils/applicantUtils";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  APPLIED: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  UNDER_REVIEW: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  SHORTLISTED: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  INTERVIEWING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  HIRED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
  WITHDRAWN: "bg-muted text-muted-foreground border-border",
};

interface ApplicantCardProps {
  applicant: Applicant;
  onUpdateStatus: (applicant: Applicant) => void;
  onScheduleInterview: (applicant: Applicant) => void;
  onViewScheduledInterview?: (interviewId: number) => void;
  onViewDetails: (applicant: Applicant) => void;
}

export default function ApplicantCard({
  applicant,
  onUpdateStatus,
  onScheduleInterview,
  onViewScheduledInterview,
  onViewDetails,
}: ApplicantCardProps) {
  const [imageError, setImageError] = useState(false);
  const rawImage = applicant.applicant_profile_image_url || applicant.profile_image_url;
  const avatarUrl = getApplicantAvatarUrl(rawImage);
  const initials = getInitials(applicant.applicant_name);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onViewDetails(applicant)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewDetails(applicant);
        }
      }}
      className="group hover:shadow-lg hover:border-primary/40 transition-all duration-200 border border-border/70 bg-card/90 backdrop-blur-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 overflow-hidden"
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {/* Candidate Avatar */}
            <div className="relative shrink-0 mt-0.5">
              <div className="h-12 w-12 rounded-full overflow-hidden border border-border/80 bg-muted/60 flex items-center justify-center shadow-sm">
                {avatarUrl && !imageError ? (
                  <Image
                    src={avatarUrl}
                    alt={applicant.applicant_name || "Applicant Avatar"}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-bold text-sm tracking-wide">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            {/* Candidate Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                  {applicant.applicant_name ?? `Applicant #${applicant.application_id}`}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[applicant.application_status]}`}
                >
                  {STATUS_LABELS[applicant.application_status]}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                {applicant.applicant_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground/70" />
                    {applicant.applicant_email}
                  </span>
                )}

                {applicant.job_title && (
                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                    <Briefcase className="h-3 w-3 text-muted-foreground/70" />
                    {applicant.job_title}
                  </span>
                )}

                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground/70" />
                  {applicant.experience_years} yrs exp
                </span>

                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-muted-foreground/70" />
                  {applicant.work_experience_count} jobs
                </span>

                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-muted-foreground/70" />
                  {applicant.resume_count} resume{applicant.resume_count !== 1 ? "s" : ""}
                </span>

                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-muted-foreground/70" />
                  {applicant.profile_completion}% profile
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground/70" />
                  Applied {timeAgo(applicant.applied_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-border/50 w-full md:w-auto justify-end">
            <Link
              href={`/vos-sync/client/messaging?freelancer_id=${applicant.user_id}&job_id=${applicant.job_id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs rounded-lg gap-1.5 border-border hover:bg-muted font-medium"
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Message
              </Button>
            </Link>

            {applicant.application_status !== "HIRED" &&
              applicant.application_status !== "REJECTED" &&
              applicant.application_status !== "INTERVIEWING" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(applicant);
                  }}
                  className="h-8 px-3 text-xs rounded-lg border-border"
                >
                  Update Status
                </Button>
              )}

            {applicant.application_status === "INTERVIEWING" && applicant.active_interview_id && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewScheduledInterview && applicant.active_interview_id) {
                    onViewScheduledInterview(applicant.active_interview_id);
                  }
                }}
                className="h-8 px-3 text-xs rounded-lg gap-1.5 border-border hover:bg-muted font-medium shadow-sm"
              >
                <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                View Interview
              </Button>
            )}

            {applicant.application_status === "SHORTLISTED" && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onScheduleInterview(applicant);
                }}
                className="h-8 px-3 text-xs rounded-lg gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Schedule Interview
              </Button>
            )}

            {applicant.application_status === "INTERVIEWING" && !applicant.active_interview_id && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onScheduleInterview(applicant);
                }}
                className="h-8 px-3 text-xs rounded-lg gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Schedule Interview
              </Button>
            )}
            <ChevronRight className="hidden sm:block h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}