// src/modules/public/find-jobs/components/PublicJobDetailModal.tsx
"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  LogIn,
  UserPlus,
  Lock,
  LayoutDashboard,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { PublicJobPosting } from "../types";
import { useAuthSession } from "@/hooks/useAuthSession";

interface Props {
  job: PublicJobPosting | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PublicJobDetailModal({ job, isOpen, onClose }: Props) {
  const session = useAuthSession();

  if (!job) return null;

  const openJobQuery = job.job_id ? `?open_job=${job.job_id}` : "";
  const targetPath = `/vos-sync/freelancer/jobs${openJobQuery}`;
  const loginHref = `/login?next=${encodeURIComponent(targetPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(targetPath)}`;
  const companyUrl = job.company_code
    ? `/companies/${job.company_code}`
    : `/companies?search=${encodeURIComponent(job.company_name ?? "")}`;

  const formatSalary = (min?: number | null, max?: number | null, curr?: string) => {
    if (!min && !max) return "Competitive Salary";
    const currency = curr || "PHP";
    const formatter = new Intl.NumberFormat("en-PH", { style: "currency", currency, maximumFractionDigits: 0 });
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `From ${formatter.format(min)}`;
    return `Up to ${formatter.format(max!)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-3xl w-[92vw] max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-6 border-b bg-muted/20 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <a
                href={companyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-14 w-14 rounded-2xl border bg-background overflow-hidden flex items-center justify-center shrink-0 shadow-xs hover:opacity-90 transition-opacity"
                title={`View ${job.company_name} details`}
              >
                {job.company_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={job.company_logo_url}
                    alt={job.company_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-7 w-7 text-muted-foreground" />
                )}
              </a>
              <div>
                <div className="flex items-center gap-2">
                  <a
                    href={companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                    title={`View ${job.company_name} details`}
                  >
                    {job.company_name}
                  </a>
                  {job.company_verification_status === "VERIFIED" && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verified Employer
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-extrabold text-foreground mt-0.5">
                  {job.job_title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {job.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    {job.job_type} • {job.work_setup}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border bg-muted/20">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Salary Range</span>
              <span className="font-extrabold text-foreground text-sm flex items-center gap-1 mt-0.5">
                {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Employment Type</span>
              <span className="font-bold text-foreground text-sm block mt-0.5">{job.job_type} • {job.work_setup}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Experience Level</span>
              <span className="font-bold text-foreground text-sm block mt-0.5">{job.experience_level || "Any Experience"}</span>
            </div>
          </div>

          {/* Job Overview */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
              Job Overview
            </h4>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-xl border">
              {job.job_description}
            </div>
          </div>

          {/* Dynamic Role-Aware CTA Card */}
          {session.isJobSeeker ? (
            /* Logged-in Job Seeker View */
            <div className="p-5 rounded-2xl border bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-950/40 dark:via-zinc-900/40 dark:to-transparent space-y-4">
              <div className="space-y-1">
                <h5 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Ready to apply for this opportunity?
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Submit your profile directly to <strong className="text-foreground">{job.company_name}</strong>. You can track your application status, receive feedback, and schedule interviews.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="sm" className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer">
                  <Link href={targetPath}>
                    Apply Now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : session.isEmployer ? (
            /* Logged-in Employer View */
            <div className="p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent space-y-4">
              <div className="space-y-1">
                <h5 className="font-bold text-foreground text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                  Signed in as Employer
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You are currently logged in with an Employer account. Job applications are exclusive to Job Seeker accounts. You can manage your company job postings in the Client Portal.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="sm" className="font-bold text-xs gap-1.5 shadow-xs">
                  <Link href="/vos-sync/client/manage-jobs">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Go to Client Portal
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="font-bold text-xs gap-1.5">
                  <Link href={loginHref}>
                    <LogIn className="h-3.5 w-3.5" />
                    Sign In as Job Seeker
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Guest / Unauthenticated View */
            <div className="p-5 rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent space-y-4">
              <div className="space-y-1">
                <h5 className="font-bold text-foreground text-sm">
                  Interested in this opportunity?
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Create a free Job Seeker account or sign in to submit your application, track application status, and receive job recommendations.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="sm" className="font-bold text-xs gap-1.5 shadow-xs">
                  <Link href={loginHref}>
                    <LogIn className="h-3.5 w-3.5" />
                    Sign In to Apply
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="font-bold text-xs gap-1.5">
                  <Link href={signupHref}>
                    <UserPlus className="h-3.5 w-3.5" />
                    Create Job Seeker Account
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Dynamic Notice Box */}
          {session.isJobSeeker ? (
            <div className="p-3.5 rounded-xl border border-indigo-200/50 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300 text-xs flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>Logged In:</strong> You are ready to apply with your active Job Seeker profile.
              </span>
            </div>
          ) : session.isEmployer ? (
            <div className="p-3.5 rounded-xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Employer Preview:</strong> Viewing this position in public preview mode.
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-muted bg-muted/40 text-muted-foreground text-xs flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                <strong>Sign in to apply</strong> — Create a free Job Seeker account or sign in to submit your application.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
            Continue Browsing Jobs
          </Button>
          {session.isJobSeeker ? (
            <Button asChild size="sm" className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Link href={targetPath}>
                Apply Now
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : session.isEmployer ? (
            <Button asChild size="sm" className="font-bold text-xs gap-1.5">
              <Link href="/vos-sync/client/manage-jobs">
                Go to Client Portal
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="font-bold text-xs gap-1.5">
              <Link href={loginHref}>
                Sign In to Apply
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

