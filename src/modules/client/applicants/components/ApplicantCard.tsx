// src/modules/client/applicants/components/ApplicantCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
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
  GraduationCap,
  CalendarPlus,
  ChevronRight,
  MessageSquare,
  FileText,
  CheckCircle2,
  Eye,
  MoreVertical,
  Edit3,
} from "lucide-react";
import { Applicant, ApplicationStatus, STATUS_LABELS } from "../types";
import { STAGE_COLOR_CLASSES } from "@/modules/client/pipeline/types";
import { getApplicantAvatarUrl, getInitials, timeAgo } from "../utils/applicantUtils";
import { cn } from "@/lib/utils";

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
  onQuickStageUpdate?: (applicant: Applicant, toStageId: number, stageName: string) => void;
  onScheduleInterview: (applicant: Applicant) => void;
  onViewScheduledInterview?: (interviewId: number) => void;
  onViewDetails: (applicant: Applicant) => void;
}

export default function ApplicantCard({
  applicant,
  onUpdateStatus,
  onQuickStageUpdate,
  onScheduleInterview,
  onViewScheduledInterview,
  onViewDetails,
}: ApplicantCardProps) {
  const [imageError, setImageError] = useState(false);
  const rawImage = applicant.applicant_profile_image_url || applicant.profile_image_url;
  const avatarUrl = getApplicantAvatarUrl(rawImage);
  const initials = getInitials(applicant.applicant_name);

  // Canonical stage authority for interview operations:
  // Available when candidate is in an INTERVIEW or ASSESSMENT stage (or legacy unmigrated status)
  const isInterviewEligible =
    applicant.stage_type === "INTERVIEW" ||
    applicant.stage_type === "ASSESSMENT" ||
    (!applicant.stage_type &&
      (applicant.application_status === "SHORTLISTED" ||
        applicant.application_status === "INTERVIEWING"));

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
      <CardContent className="p-4 sm:p-5 max-md:p-3">
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
                  <span className="flex items-center gap-1 text-sm text-muted-foreground md:text-xs">
                    <Mail className="h-3 w-3 text-muted-foreground/70" />
                    {applicant.applicant_email}
                  </span>
                )}

                {applicant.job_title && (
                  <span className="flex items-center gap-1 text-sm font-medium text-foreground/85 md:text-xs">
                    <Briefcase className="h-3 w-3 text-muted-foreground/70" />
                    {applicant.job_title}
                  </span>
                )}

                {applicant.is_referred && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-semibold py-0.5 px-2 gap-1 rounded-full",
                      applicant.referral_type === "SCHOOL_ADMIN"
                        ? "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                    )}
                  >
                    {applicant.referral_type === "SCHOOL_ADMIN" ? (
                      <>
                        🎓 {applicant.referral_school_name ? `Endorsed by ${applicant.referral_school_name}` : "School Endorsed"}
                      </>
                    ) : (
                      <>
                        👥 Peer Referral
                      </>
                    )}
                  </Badge>
                )}
              </div>

              {/* Row 2: Secondary Stats (Muted Softer Text) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground/80 md:text-xs">
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

              {/* Education preview: first ordered record plus remainder */}
              {(applicant.education_count ?? applicant.education?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground/80 md:text-xs">
                  {(() => {
                    const preview = (applicant.education ?? [])[0];
                    const total = applicant.education_count ?? applicant.education?.length ?? 0;
                    const label = preview
                      ? [preview.school_name, preview.course_name].filter(Boolean).join(" · ") || "Education on file"
                      : [applicant.education_school, applicant.education_course].filter(Boolean).join(" · ") || "Education on file";
                    return (
                      <>
                        <span className="flex items-center gap-1 min-w-0">
                          <GraduationCap className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className="truncate">{label}</span>
                        </span>
                        {total > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-xs text-muted-foreground/70">
                            +{total - 1} more
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Status Badge Column + Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50 w-full lg:w-auto justify-between lg:justify-end max-md:flex-col max-md:items-start max-md:gap-3">
            {/* Status Badge - Anchored to a fixed column */}
            <div className="shrink-0 flex items-center">
              <motion.div
                key={applicant.current_stage_id ?? applicant.application_status}
                initial={{ scale: 0.82, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 450, damping: 26 }}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all duration-200 shadow-2xs md:text-[11px]",
                    STAGE_COLOR_CLASSES[applicant.stage_color || "sky"]?.badge ||
                      STATUS_STYLES[applicant.application_status]
                  )}
                >
                  {applicant.stage_name || STATUS_LABELS[applicant.application_status] || applicant.application_status}
                </Badge>
              </motion.div>
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-2 shrink-0 max-md:w-full max-md:flex-wrap">
              {/* View Candidate Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(applicant);
                }}
                className="h-8 max-md:min-h-10 max-md:flex-1 px-3 text-sm rounded-lg gap-1.5 hover:bg-muted font-medium text-foreground md:text-xs"
              >
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                View Candidate
              </Button>

              {/* Message Button */}
              <Link
                href={`/vos-sync/client/messaging?freelancer_id=${applicant.user_id}&job_id=${applicant.job_id}`}
                onClick={(e) => e.stopPropagation()}
                className="max-md:flex-1"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 max-md:min-h-10 max-md:w-full px-3 text-sm rounded-lg gap-1.5 border-border hover:bg-muted font-medium md:text-xs"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  Message
                </Button>
              </Link>

              {/* Contextual Primary Action Button (Canonical Stage Authority) */}
              {isInterviewEligible && (
                applicant.active_interview_id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewScheduledInterview && applicant.active_interview_id) {
                        onViewScheduledInterview(applicant.active_interview_id);
                      }
                    }}
                    className="h-8 max-md:min-h-10 max-md:flex-1 px-3 text-sm rounded-lg gap-1.5 border-border hover:bg-muted font-medium shadow-sm md:text-xs"
                  >
                    <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                    View Interview
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScheduleInterview(applicant);
                    }}
                    className="h-8 max-md:min-h-10 max-md:flex-1 px-3 text-sm rounded-lg gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium md:text-xs"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Schedule Interview
                  </Button>
                )
              )}

              {/* 3 Dots Actions (Pipeline-Driven Stage Progression) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 p-0 max-md:size-10 max-md:p-0 max-md:shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="More candidate actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider md:text-[10px]">
                    Stage Progression
                  </DropdownMenuLabel>

                  {/* Dynamic Destinations from Active Job Pipeline */}
                  {applicant.allowed_next_stages && applicant.allowed_next_stages.length > 0 ? (
                    applicant.allowed_next_stages.map((stage) => {
                      const dotColor =
                        STAGE_COLOR_CLASSES[stage.color]?.dot || "bg-primary";
                      return (
                        <DropdownMenuItem
                          key={stage.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onQuickStageUpdate) {
                              onQuickStageUpdate(
                                applicant,
                                stage.id,
                                stage.stage_name
                              );
                            } else {
                              onUpdateStatus(applicant);
                            }
                          }}
                          className={cn(
                            "text-sm gap-2 cursor-pointer py-1.5 max-md:min-h-10 font-medium md:text-xs",
                            stage.stage_type === "REJECTED"
                              ? "text-rose-600 focus:text-rose-600"
                              : stage.stage_type === "HIRED"
                              ? "text-emerald-600 focus:text-emerald-600"
                              : ""
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              dotColor
                            )}
                          />
                          <span>Move to {stage.stage_name}</span>
                        </DropdownMenuItem>
                      );
                    })
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                      {applicant.stage_type === "HIRED" ||
                      applicant.stage_type === "REJECTED" ||
                      applicant.stage_type === "WITHDRAWN" ||
                      applicant.application_status === "HIRED" ||
                      applicant.application_status === "REJECTED" ||
                      applicant.application_status === "WITHDRAWN"
                        ? "Terminal state — no further moves"
                        : "No transitions available"}
                    </div>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(applicant);
                    }}
                    className="text-sm gap-2 cursor-pointer max-md:min-h-10 md:text-xs"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                    Update Candidate Stage...
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

