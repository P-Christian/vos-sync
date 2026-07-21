/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Briefcase,
  Users,
  GraduationCap,
  DollarSign,
  Building2,
  Layers,
  HelpCircle,
  Mail,
  Phone,
  Facebook,

  Instagram,
  Youtube,
} from "lucide-react";
import { PublicJobPosting, JOB_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS, JobSkill } from "../types";

interface Props {
  job: PublicJobPosting | null;
  open: boolean;
  onClose: () => void;
  onApply: (job: PublicJobPosting) => void;
  appliedJobIds?: number[];
}

function formatSalary(job: PublicJobPosting): string {
  if (job.salary_negotiable) return "Negotiable";
  const currency = job.currency ?? "PHP";
  if (job.salary_type === "Fixed Salary" && job.salary_min) {
    return `${currency} ${Number(job.salary_min).toLocaleString()} / mo`;
  }
  if (job.salary_min && job.salary_max) {
    return `${currency} ${Number(job.salary_min).toLocaleString()} – ${Number(job.salary_max).toLocaleString()} / mo`;
  }
  if (job.salary_min) return `${currency} ${Number(job.salary_min).toLocaleString()}+ / mo`;
  return "Salary not disclosed";
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function getImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return `/api/client/assets/${value}`;
}

const parseJsonField = (value: string | null | undefined): Record<string, unknown> => {
  if (!value) return {};
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // ignore
    }
  }
  return {};
};

export function JobDetailSheet({ job, open, onClose }: Props) {
  if (!job) return null;

  const descData = parseJsonField(job.job_description);
  const reqsData = parseJsonField(job.job_requirements);

  const descriptionText = (descData.text as string) || job.job_description || "";
  const responsibilitiesText = (descData.job_responsibilities as string) || job.job_responsibilities || "";
  const qualificationsText = (reqsData.job_qualifications as string) || job.job_qualifications || "";
  const salaryType = (reqsData.salary_type as string) || job.salary_type || "Salary Range";
  const arrangement = (descData.work_arrangement as string) || job.work_arrangement || "Remote";
  const openings = (descData.number_of_openings as string) || job.number_of_openings || "1";
  const education = (reqsData.education as string) || job.education || "";
  const skills = (reqsData.skills as JobSkill[]) || job.skills || [];
  const benefits = (reqsData.benefits as string[]) || job.benefits || [];
  const screeningQuestions = (reqsData.screening_questions as string[]) || job.screening_questions || [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-1/2 flex flex-col p-0 gap-0"
      >
        {/* Cover Banner */}
        <div className="h-32 w-full bg-linear-to-r from-emerald-500/10 to-teal-500/10 relative overflow-hidden shrink-0 border-b">
          {job.company_cover ? (
            <img
              src={getImageUrl(job.company_cover)}
              alt="Company Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800" />
          )}
        </div>

        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 -mt-12 relative z-20 rounded-2xl border-4 border-background bg-muted flex items-center justify-center text-md font-bold text-foreground shrink-0 overflow-hidden shadow-xs">
                {job.company_logo ? (
                  <img src={getImageUrl(job.company_logo)} alt={job.company?.company_name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  getInitials(job.company?.company_name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base font-bold text-foreground leading-tight">
                  {job.job_title}
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground mt-0.5">
                  {job.company?.company_name ?? "Unknown Company"}
                </SheetDescription>
              </div>
            </div>

            {/* <a
              href={`/vos-sync/freelancer/jobs/${job.job_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold shrink-0 mr-6"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open job in a new window
            </a> */}
          </div>

          {/* Quick meta */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
              <MapPin className="h-3 w-3" /> {job.job_location}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
              <Briefcase className="h-3 w-3" /> {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
              <Building2 className="h-3 w-3" /> {arrangement}
            </span>
            {Number(openings) > 1 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                <Users className="h-3 w-3" /> {openings} openings
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Job Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Salary & Requirements Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase mb-1">
                    <DollarSign className="h-3 w-3" /> Salary
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatSalary(job)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{salaryType}</p>
                </div>
                {job.experience_level && (
                  <div className="p-3 rounded-xl bg-muted/40 border">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase mb-1">
                      <Layers className="h-3 w-3" /> Experience
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {EXPERIENCE_LEVEL_LABELS[job.experience_level] ?? job.experience_level}
                    </p>
                  </div>
                )}
                {education && (
                  <div className="p-3 rounded-xl bg-muted/40 border col-span-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase mb-1">
                      <GraduationCap className="h-3 w-3" /> Education
                    </div>
                    <p className="text-sm text-foreground">{education}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Job Description */}
              <Section title="Job Description">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {descriptionText}
                </p>
              </Section>

              {/* Responsibilities */}
              {responsibilitiesText && (
                <>
                  <Separator />
                  <Section title="Responsibilities">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                      {responsibilitiesText}
                    </p>
                  </Section>
                </>
              )}

              {/* Qualifications */}
              {qualificationsText && (
                <>
                  <Separator />
                  <Section title="Qualifications">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                      {qualificationsText}
                    </p>
                  </Section>
                </>
              )}

              {/* Skills */}
              {skills && skills.length > 0 && (
                <>
                  <Separator />
                  <Section title="Required Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs px-2.5 py-0.5 rounded-full font-normal">
                          {s.skill_name}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              {/* Benefits */}
              {benefits && benefits.length > 0 && (
                <>
                  <Separator />
                  <Section title="Benefits">
                    <div className="flex flex-wrap gap-1.5">
                      {benefits.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              {/* Screening Questions preview */}
              {screeningQuestions && screeningQuestions.length > 0 && (
                <>
                  <Separator />
                  <Section title={`Screening Questions (${screeningQuestions.length})`}>
                    <div className="space-y-2">
                      {screeningQuestions.map((q, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-foreground/70 bg-muted/40 rounded-lg p-1">
                          <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      You will answer these questions in the application form.
                    </p>
                  </Section>
                </>
              )}
            </div>

            {/* Right Column: Client info */}
            <div className="md:col-span-1 space-y-5 border-t pt-5 md:border-l md:border-l-0 md:pl-5 border-border/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About the client</h3>

              <div className="space-y-4">
                {/* Location */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Location</span>
                  <div className="flex items-start gap-1.5 text-xs text-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-500" />
                    <span>
                      {[job.company_address, job.company_city, job.company_province].filter(Boolean).join(", ") || job.job_location}
                    </span>
                  </div>
                </div>

                {/* Email */}
                {job.company_email && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Company Email</span>
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate" title={job.company_email}>{job.company_email}</span>
                    </div>
                  </div>
                )}

                {/* Contact */}
                {job.company_contact && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Company Contact</span>
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span>{job.company_contact}</span>
                    </div>
                  </div>
                )}

                {/* Socials */}
                {(job.company_facebook|| job.company_instagram || job.company_x || job.company_youtube) && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Social Media</span>
                    <div className="flex flex-wrap gap-2">
                      {job.company_facebook && (
                        <a href={job.company_facebook} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-muted hover:bg-muted/85 rounded-lg text-zinc-600 dark:text-zinc-400">
                          <Facebook className="h-4 w-4" />
                        </a>
                      )}

                      {job.company_instagram && (
                        <a href={job.company_instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-muted hover:bg-muted/85 rounded-lg text-zinc-600 dark:text-zinc-400">
                          <Instagram className="h-4 w-4" />
                        </a>
                      )}
                      {job.company_youtube && (
                        <a href={job.company_youtube} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-muted hover:bg-muted/85 rounded-lg text-zinc-600 dark:text-zinc-400">
                          <Youtube className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
