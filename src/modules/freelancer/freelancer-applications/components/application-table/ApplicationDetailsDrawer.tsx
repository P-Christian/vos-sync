// src/modules/freelancer/freelancer-applications/components/application-table/ApplicationDetailsDrawer.tsx
"use client";

import React, { useState } from "react";
import {
  DollarSign,
  ExternalLink,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { CompanyProfile, ApplicationItem, PublicJobPosting } from "../../types";
import { JobDetailSheet } from "../JobDetailSheet";
import { ApplicationProgressTimeline } from "./ApplicationProgressTimeline";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { ReferralBlock } from "./ReferralBlock";
import { formatDate, getInitials } from "./formatters";

interface Props {
  application: ApplicationItem | null;
  onClose: () => void;
  onSelectCompany: (company: CompanyProfile | null) => void;
}

export function ApplicationDetailsDrawer({ application, onClose, onSelectCompany }: Props) {
  const [originalJob, setOriginalJob] = useState<PublicJobPosting | null>(null);
  const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);

  const handleOpenJobPost = async (jobId: number) => {
    try {
      setLoadingJob(true);
      const res = await fetch("/api/freelancer/jobs");
      if (res.ok) {
        const data = await res.json();
        const jobs: PublicJobPosting[] = data.jobs || [];
        const found = jobs.find((j) => j.job_id === jobId);
        if (found) {
          setOriginalJob(found);
          setIsJobSheetOpen(true);
        } else {
          toast.error("Could not find the original job post. It might have been closed or deleted.");
        }
      } else {
        toast.error("Failed to load original job post.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading job post.");
    } finally {
      setLoadingJob(false);
    }
  };

  const hasCompanyDetails = !!application?.company_details;

  return (
    <>
      <Drawer direction="right" open={!!application} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-full !w-[90vw] sm:!w-[800px] !max-w-none ml-auto right-0 rounded-none border-l">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="text-xl">Application Details</DrawerTitle>
            <DrawerDescription>
              Submitted on {formatDate(application?.applied_at)}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-6 overflow-y-auto space-y-6">
            {application && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div
                    className={`flex items-center gap-4 ${hasCompanyDetails ? "group cursor-pointer" : ""}`}
                    onClick={(e) => {
                      if (application.company_details) {
                        e.stopPropagation();
                        onSelectCompany(application.company_details);
                      }
                    }}
                  >
                    <div
                      className={`w-12 h-12 rounded-lg border bg-muted flex items-center justify-center text-lg font-bold text-foreground shrink-0 overflow-hidden ${hasCompanyDetails ? "group-hover:border-primary/50 transition-colors" : ""}`}
                    >
                      {application.company_details?.company_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            application.company_details.company_logo.startsWith("http")
                              ? application.company_details.company_logo
                              : `/api/client/assets/${application.company_details.company_logo}`
                          }
                          alt={application.company_name ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(application.company_name)
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{application.job_title ?? "—"}</h3>
                      <p
                        className={`text-sm text-muted-foreground ${hasCompanyDetails ? "group-hover:text-primary group-hover:underline transition-all" : ""}`}
                      >
                        {application.company_name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 max-md:min-h-11"
                    disabled={loadingJob}
                    onClick={() => handleOpenJobPost(application.job_id)}
                  >
                    <span className="flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      {loadingJob ? "Loading..." : "View Original Job Post"}
                    </span>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-b border-border/50 pb-6">
                  {application.job_location && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {application.job_location.toLowerCase()}
                    </span>
                  )}
                  {application.job_type && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {application.job_type.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                  {application.work_arrangement && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {application.work_arrangement.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                  {application.experience_level && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/10 capitalize">
                      {application.experience_level.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                </div>

                {application.job_description && (
                  <div className="space-y-2">
                    <p className="text-sm md:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Job Description
                    </p>
                    <div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-wrap border border-border/50 text-foreground max-h-60 overflow-y-auto">
                      {application.job_description}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm md:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Current Status
                    </p>
                    <div>
                      <ApplicationStatusBadge status={application.application_status} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm md:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Expected Salary
                    </p>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      {application.expected_salary
                        ? application.expected_salary.toLocaleString()
                        : "Not specified"}
                    </div>
                  </div>
                </div>

                {application.is_referred && (
                  <ReferralBlock
                    schoolName={application.school_name}
                    referrerName={application.referrer_name}
                    referralLetter={application.referral_letter}
                  />
                )}

                <div className="space-y-2">
                  <p className="text-sm md:text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Cover Letter
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-wrap border border-border/50 text-foreground">
                    {application.cover_letter || (
                      <span className="text-muted-foreground italic">No cover letter provided.</span>
                    )}
                  </div>
                </div>

                {application.portfolio_url && (
                  <div className="space-y-2">
                    <p className="text-sm md:text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" /> Portfolio
                    </p>
                    <a
                      href={
                        application.portfolio_url.startsWith("http")
                          ? application.portfolio_url
                          : `https://${application.portfolio_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline block truncate"
                    >
                      {application.portfolio_url}
                    </a>
                  </div>
                )}

                {application.resume && (
                  <div className="space-y-2">
                    <p className="text-sm md:text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Attached Resume
                    </p>
                    <a
                      href={
                        application.resume.file_url.startsWith("http")
                          ? application.resume.file_url
                          : `/api/freelancer/assets/${application.resume.file_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 p-3 w-full rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground truncate block flex-1">
                        {application.resume.file_name || "Resume Document"}
                      </span>
                    </a>
                  </div>
                )}

                <ApplicationProgressTimeline status={application.application_status} />
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <JobDetailSheet
        job={originalJob}
        open={isJobSheetOpen}
        onClose={() => setIsJobSheetOpen(false)}
      />
    </>
  );
}
