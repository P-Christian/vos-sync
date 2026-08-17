// src/modules/client/applicants/components/ApplicantCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Mail,
  Briefcase,
  Clock,
  CalendarPlus,
  ChevronRight,
  MessageSquare,
  FileText,
  CheckCircle2,
  Eye,
  MoreVertical,
  Edit3,
  UserCheck,
  XCircle,
  RotateCcw,
} from "lucide-react";
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
  onQuickStatusUpdate?: (applicant: Applicant, status: ApplicationStatus) => void;
  onScheduleInterview: (applicant: Applicant) => void;
  onViewScheduledInterview?: (interviewId: number) => void;
  onViewDetails: (applicant: Applicant) => void;
}

export default function ApplicantCard({
  applicant,
  onUpdateStatus,
  onQuickStatusUpdate,
  onScheduleInterview,
  onViewScheduledInterview,
  onViewDetails,
}: ApplicantCardProps) {
  const [imageError, setImageError] = useState(false);
  const rawImage = applicant.applicant_profile_image_url || applicant.profile_image_url;
  const avatarUrl = getApplicantAvatarUrl(rawImage);
  const initials = getInitials(applicant.applicant_name);

  const handleQuickStatus = (newStatus: ApplicationStatus, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (newStatus === applicant.application_status) return;
    if (onQuickStatusUpdate) {
      onQuickStatusUpdate(applicant, newStatus);
    } else {
      onUpdateStatus(applicant);
    }
  };

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Side: Avatar + Stacked Info */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Candidate Avatar */}
            <div className="relative shrink-0">
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

            {/* Candidate Info - Two Stacked Rows */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Row 1: Primary Identifiers (Name, Email, Job Title) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                  {applicant.applicant_name ?? `Applicant #${applicant.application_id}`}
                </h3>

                {applicant.applicant_email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 text-muted-foreground/70" />
                    {applicant.applicant_email}
                  </span>
                )}

                {applicant.job_title && (
                  <span className="flex items-center gap-1 text-xs font-medium text-foreground/85">
                    <Briefcase className="h-3 w-3 text-muted-foreground/70" />
                    {applicant.job_title}
                  </span>
                )}
              </div>

              {/* Row 2: Secondary Stats (Muted Softer Text) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/80">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground/60" />
                  {applicant.experience_years} yrs exp
                </span>

                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-muted-foreground/60" />
                  {applicant.work_experience_count} job experience{applicant.work_experience_count !== 1 ? "s" : ""}
                </span>

                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-muted-foreground/60" />
                  {applicant.resume_count} resume{applicant.resume_count !== 1 ? "s" : ""}
                </span>

                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-muted-foreground/60" />
                  {applicant.profile_completion}% profile
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                  Applied {timeAgo(applicant.applied_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Status Badge Column + Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50 w-full lg:w-auto justify-between lg:justify-end">
            {/* Status Badge - Anchored to a fixed column */}
            <div className="shrink-0 flex items-center">
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[applicant.application_status]}`}
              >
                {STATUS_LABELS[applicant.application_status]}
              </Badge>
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-2 shrink-0">
              {/* View Candidate Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(applicant);
                }}
                className="h-8 px-3 text-xs rounded-lg gap-1.5 hover:bg-muted font-medium text-foreground"
              >
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                View Candidate
              </Button>

              {/* Message Button */}
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

              {/* Contextual Primary Action Button */}
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

              {/* 3 Dots Actions (Secondary Admin Actions Only) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="More candidate actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Quick Actions
                  </DropdownMenuLabel>

                  {/* Dynamic Status Update Actions */}
                  {applicant.application_status === "APPLIED" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("UNDER_REVIEW", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 font-medium"
                      >
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        Move to Under Review
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("SHORTLISTED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 font-medium"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                        Shortlist Candidate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("REJECTED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 text-rose-600 focus:text-rose-600 font-medium"
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-500" />
                        Reject Candidate
                      </DropdownMenuItem>
                    </>
                  )}

                  {applicant.application_status === "UNDER_REVIEW" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("SHORTLISTED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 font-medium"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                        Shortlist Candidate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("REJECTED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 text-rose-600 focus:text-rose-600 font-medium"
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-500" />
                        Reject Candidate
                      </DropdownMenuItem>
                    </>
                  )}

                  {applicant.application_status === "SHORTLISTED" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("HIRED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 text-emerald-600 focus:text-emerald-600 font-medium"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Mark as Hired
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("REJECTED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 text-rose-600 focus:text-rose-600 font-medium"
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-500" />
                        Reject Candidate
                      </DropdownMenuItem>
                    </>
                  )}

                  {applicant.application_status === "INTERVIEWING" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("HIRED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 text-emerald-600 focus:text-emerald-600 font-medium"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Mark as Hired
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleQuickStatus("REJECTED", e)}
                        className="text-xs gap-2 cursor-pointer py-1.5 text-rose-600 focus:text-rose-600 font-medium"
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-500" />
                        Reject Candidate
                      </DropdownMenuItem>
                    </>
                  )}

                  {(applicant.application_status === "REJECTED" ||
                    applicant.application_status === "WITHDRAWN") && (
                    <DropdownMenuItem
                      onClick={(e) => handleQuickStatus("UNDER_REVIEW", e)}
                      className="text-xs gap-2 cursor-pointer py-1.5 font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                      Reopen Application
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(applicant);
                    }}
                    className="text-xs gap-2 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                    Custom Status & Notes...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ChevronRight className="hidden sm:block h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
