// src/modules/client/applicants/components/ApplicantDetailsModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  ExternalLink,
  GraduationCap,
  Wallet,
  CalendarPlus,
  AlertCircle,
  Download,
  NotebookText,
  BadgeQuestionMark,
  AwardIcon,
  Star,
  Banknote,
  LetterText,
  User2,
  Contact,
  LandPlot,
  Eye,
  DownloadIcon,
  Globe,
  Sparkles,
  MessageSquare,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApplicantAiAnalysisModal } from "./ApplicantAiAnalysisModal";
import {
  getCachedApplicantAnalysis,
  setCachedApplicantAnalysis,
  CandidateAiAnalysis,
} from "../utils/applicantAiCache";
import {
  faFacebook,
  faLinkedin,
  faInstagram,
  faYoutube,
  faXTwitter,
  faGithub,
} from "@fortawesome/free-brands-svg-icons";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { Applicant, ApplicationStatus, CandidateDetail, STATUS_LABELS } from "../types";
import {
  getApplicantAvatarUrl,
  getInitials,
  formatDate,
  formatDateRange,
  formatCurrency,
  timeAgo,
} from "../utils/applicantUtils";

const DocumentViewer = dynamic(
  () => import("@/components/DocumentViewer").then((mod) => mod.DocumentViewer),
  { ssr: false }
);

interface ParsedCoverLetter {
  text: string;
  document?: {
    fileName: string;
    fileUrl: string;
  } | null;
}

function parseCoverLetter(raw?: string | null): ParsedCoverLetter {
  if (!raw) return { text: "" };
  const linkRegex = /\[(?:Cover Letter Document:\s*)?([^\]]+)\]\(([^)]+)\)/i;
  const match = raw.match(linkRegex);
  if (match) {
    const fileName = match[1].trim();
    let fileUrl = match[2].trim();
    const assetsMatch = fileUrl.match(/\/assets\/([a-zA-Z0-9-]+)/);
    if (assetsMatch?.[1]) {
      fileUrl = `/api/client/assets/${assetsMatch[1]}`;
    }
    const text = raw.replace(match[0], "").trim();
    return { text, document: { fileName, fileUrl } };
  }
  return { text: raw.trim() };
}

function formatSocialHandle(url?: string | null): string {
  if (!url) return "";
  const clean = url.trim().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return clean.replace(/^\//, "");
}

function getSocialIcon(platformStr?: string | null, urlStr?: string | null) {
  const p = (platformStr || "").toLowerCase();
  const u = (urlStr || "").toLowerCase();

  if (p.includes("facebook") || u.includes("facebook.com") || u.includes("fb.com")) {
    return { icon: faFacebook, color: "text-[#1877F2]" };
  }
  if (p.includes("linkedin") || u.includes("linkedin.com")) {
    return { icon: faLinkedin, color: "text-[#0A66C2]" };
  }
  if (p.includes("instagram") || u.includes("instagram.com") || u.includes("instagr.am")) {
    return { icon: faInstagram, color: "text-[#E4405F]" };
  }
  if (p.includes("youtube") || u.includes("youtube.com") || u.includes("youtu.be")) {
    return { icon: faYoutube, color: "text-[#FF0000]" };
  }
  if (p.includes("twitter") || p.includes("x.com") || p === "x" || u.includes("twitter.com") || u.includes("x.com")) {
    return { icon: faXTwitter, color: "text-foreground" };
  }
  if (p.includes("github") || u.includes("github.com")) {
    return { icon: faGithub, color: "text-foreground" };
  }
  return { icon: faGlobe, color: "text-primary" };
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  APPLIED: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  UNDER_REVIEW: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  SHORTLISTED: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  INTERVIEWING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  HIRED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
  WITHDRAWN: "bg-muted text-muted-foreground border-border",
};

function AnimatedSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/80 bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <span>{title}</span>
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

interface ApplicantDetailsModalProps {
  applicant: Applicant | null;
  detail: CandidateDetail | null;
  loading: boolean;
  error: string;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: () => void;
  onScheduleInterview: () => void;
}

export default function ApplicantDetailsModal({
  applicant,
  detail,
  loading,
  error,
  open,
  onClose,
  onUpdateStatus,
  onScheduleInterview,
}: ApplicantDetailsModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [cachedAnalysis, setCachedAnalysis] = useState<CandidateAiAnalysis | null>(null);

  const activeApplicant: Applicant | null = applicant || (detail ? {
    application_id: detail.application_id,
    user_id: detail.user_id,
    job_id: detail.job_id,
    job_title: detail.job_title,
    applicant_name: detail.applicant_name,
    applicant_email: detail.applicant_email,
    profile_image_url: detail.profile_image,
    application_status: detail.application_status,
    applied_at: detail.applied_at,
    experience_years: detail.experience_years,
    work_experience_count: detail.work_experience_count,
    resume_count: detail.resume_count,
    skills: detail.skills,
  } as Applicant : null);

  useEffect(() => {
    const appId = activeApplicant?.application_id || detail?.application_id;
    if (!appId || !open) {
      setCachedAnalysis(null);
      return;
    }

    // 1. Instant check from local cache
    const cached = getCachedApplicantAnalysis(appId);
    if (cached) {
      setCachedAnalysis(cached);
    } else {
      setCachedAnalysis(null);
    }

    // 2. Query DB to verify if evaluation exists for this exact application_id
    let isMounted = true;
    fetch(`/api/client/applicants/${appId}/ai-analysis`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          if (data?.success && data.analysis) {
            setCachedAnalysis(data.analysis);
            setCachedApplicantAnalysis(appId, data.analysis);
          } else if (!cached) {
            setCachedAnalysis(null);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [activeApplicant?.application_id, detail?.application_id, aiModalOpen, open]);

  if (!activeApplicant && !loading) return null;

  const name = activeApplicant?.applicant_name ?? (detail?.application_id ? `Applicant #${detail.application_id}` : "Applicant Details");
  const status: ApplicationStatus = detail?.application_status ?? activeApplicant?.application_status ?? "APPLIED";
  const jobTitle = detail?.job_title ?? activeApplicant?.job_title ?? "—";
  const appliedAt = detail?.applied_at ?? activeApplicant?.applied_at;
  const expectedSalary = formatCurrency(detail?.expected_salary ?? null);

  const rawImage = detail?.profile_image ?? activeApplicant?.applicant_profile_image_url ?? activeApplicant?.profile_image_url;
  const avatarUrl = getApplicantAvatarUrl(rawImage);
  const initials = getInitials(name);

  const profileCompletion = detail?.profile_completion ?? activeApplicant?.profile_completion ?? 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] !max-w-[1300px] h-[90vh] p-0 overflow-hidden flex flex-col border-border/80 bg-background">
        {/* Sticky Header */}
        <div className="shrink-0 border-b border-border bg-card/90 backdrop-blur-md px-6 py-4">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar with image and fallback */}
                <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shadow-sm">
                  {avatarUrl && !imageError ? (
                    <Image
                      src={avatarUrl}
                      alt={name}
                      width={56}
                      height={56}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                      className={`h-full w-full object-cover transition-opacity duration-300 ${
                        imageLoaded ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ) : null}

                  {(!avatarUrl || !imageLoaded || imageError) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center font-bold text-base text-primary-foreground">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Candidate Title & Meta */}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2.5 flex-wrap text-foreground">
                    <span>{name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </Badge>
                  </DialogTitle>

                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" />
                      {jobTitle}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                      Applied {timeAgo(appliedAt)}
                    </span>

                    {detail?.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {detail.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-6 [scrollbar-gutter:stable] bg-muted/20">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {loading && !detail ? (
            <div className="space-y-4 py-8 max-w-2xl mx-auto">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-6 animate-pulse rounded-lg bg-muted"
                  style={{ width: `${85 - i * 12}%` }}
                />
              ))}
            </div>
          ) : detail ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ── Left Column (Overview & Details) ────── */}
              <div className="lg:col-span-5 space-y-5">
                {/* Profile Metrics */}
                <AnimatedSection delay={0.05}>
                  <SectionCard icon={LandPlot} title="Profile Metrics">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                        <p className="text-[11px] text-muted-foreground">Profile Completion</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{profileCompletion}%</p>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                        <p className="text-[11px] text-muted-foreground">Experience</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          {detail.experience_years ?? activeApplicant?.experience_years ?? 0} yrs
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                        <p className="text-[11px] text-muted-foreground">Work Records</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          {detail.work_experience_count ?? activeApplicant?.work_experience_count ?? 0}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                        <p className="text-[11px] text-muted-foreground">Resumes</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                          {detail.resume_count ?? activeApplicant?.resume_count ?? 0}
                        </p>
                      </div>
                    </div>
                  </SectionCard>
                </AnimatedSection>

                {/* Contact Info */}
                <AnimatedSection delay={0.1}>
                  <SectionCard icon={Contact} title="Contact Information">
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-2.5 text-foreground">
                        <Mail className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium break-all">{detail.applicant_email || "—"}</span>
                      </div>

                      {detail.applicant_phone && (
                        <div className="flex items-center gap-2.5 text-foreground">
                          <Phone className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium">{detail.applicant_phone}</span>
                        </div>
                      )}

                      {detail.location && (
                        <div className="flex items-center gap-2.5 text-foreground">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium">{detail.location}</span>
                        </div>
                      )}

                      {detail.portfolio_url && (
                        <div className="flex items-center gap-2.5 text-foreground">
                          <Globe className="h-4 w-4 text-primary shrink-0" />
                          <a
                            href={detail.portfolio_url.startsWith("http") ? detail.portfolio_url : `https://${detail.portfolio_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline truncate max-w-[220px]"
                          >
                            {detail.portfolio_url.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </AnimatedSection>

                {/* Compensation & Links */}
                {(detail.portfolio_url || expectedSalary) && (
                  <AnimatedSection delay={0.15}>
                    <SectionCard icon={Banknote} title="Compensation & Portfolio">
                      <div className="flex flex-wrap gap-2">
                        {expectedSalary && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold text-foreground">
                            <Wallet className="h-3.5 w-3.5 text-primary" />
                            {expectedSalary} expected
                          </div>
                        )}
                        {detail.portfolio_url && (
                          <a
                            href={detail.portfolio_url.startsWith("http") ? detail.portfolio_url : `https://${detail.portfolio_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-primary" />
                            View Portfolio
                          </a>
                        )}
                      </div>
                    </SectionCard>
                  </AnimatedSection>
                )}

                {/* Screening Answers */}
                <AnimatedSection delay={0.2}>
                  <SectionCard icon={BadgeQuestionMark} title="Screening Answers">
                    {detail.screening_answers && detail.screening_answers.length > 0 ? (
                      <div className="space-y-3">
                        {detail.screening_answers.map((item) => (
                          <div key={item.question_id} className="rounded-lg border border-border/60 bg-background/50 p-2.5">
                            <p className="text-xs font-semibold text-muted-foreground">{item.question_text}</p>
                            {item.answer_text?.trim() ? (
                              <p className="text-xs text-foreground mt-1 font-medium">{item.answer_text}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic mt-1">No answer provided</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center rounded-lg border border-dashed border-border/60 bg-muted/20">
                        <p className="text-xs text-muted-foreground font-medium">No screening answers submitted</p>
                      </div>
                    )}
                  </SectionCard>
                </AnimatedSection>

                {/* Social Media Links */}
                {detail.social_links && detail.social_links.length > 0 && (
                  <AnimatedSection delay={0.25}>
                    <SectionCard icon={Globe} title="Social Links">
                      <div className="flex flex-wrap gap-2">
                        {detail.social_links.map((link, index) => {
                          const platformStr = link.platform || link.platform_name || "";
                          const urlStr = link.profile_url || link.url || "";
                          const iconInfo = getSocialIcon(platformStr, urlStr);
                          const displayHandle = formatSocialHandle(urlStr);
                          const isPortfolio = platformStr.toLowerCase().includes("portfolio");
                          const chipLabel = isPortfolio ? "Portfolio Website" : (displayHandle || platformStr || "Link");
                          const href = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;

                          return (
                            <a
                              key={index}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full border border-border bg-background hover:border-primary text-xs font-medium text-foreground transition-all"
                            >
                              <FontAwesomeIcon icon={iconInfo.icon} className={cn("h-3.5 w-3.5", iconInfo.color)} />
                              <span className="truncate max-w-[140px] text-[11px]">{chipLabel}</span>
                            </a>
                          );
                        })}
                      </div>
                    </SectionCard>
                  </AnimatedSection>
                )}

                {/* Client Notes */}
                {detail.client_notes && (
                  <AnimatedSection delay={0.3}>
                    <SectionCard icon={NotebookText} title="Client Notes">
                      <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">{detail.client_notes}</p>
                    </SectionCard>
                  </AnimatedSection>
                )}
              </div>

              {/* ── Right Column (Credentials, Experience & Docs) ────── */}
              <div className="lg:col-span-7 space-y-5">
                {/* Professional Summary & Headline */}
                {(detail.profile_headline || detail.professional_summary) && (
                  <AnimatedSection delay={0.05}>
                    <SectionCard icon={User2} title="Professional Summary">
                      {detail.profile_headline && (
                        <h4 className="font-semibold text-foreground text-sm">{detail.profile_headline}</h4>
                      )}
                      {detail.professional_summary && (
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                          {detail.professional_summary}
                        </p>
                      )}
                    </SectionCard>
                  </AnimatedSection>
                )}

                {/* Cover Letter */}
                {detail.cover_letter && (() => {
                  const parsed = parseCoverLetter(detail.cover_letter);
                  if (!parsed.text && !parsed.document) return null;
                  return (
                    <AnimatedSection delay={0.1}>
                      <SectionCard icon={LetterText} title="Cover Letter">
                        <div className="space-y-3">
                          {parsed.text && (
                            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{parsed.text}</p>
                          )}
                          {parsed.document && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ fileName: parsed.document!.fileName, fileUrl: parsed.document!.fileUrl })}
                                className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors flex-1 min-w-0"
                              >
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <span className="truncate flex-1 text-left">{parsed.document.fileName}</span>
                                <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </button>
                              <a
                                href={parsed.document.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors shrink-0"
                                title="Download Cover Letter"
                              >
                                <DownloadIcon className="h-4 w-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      </SectionCard>
                    </AnimatedSection>
                  );
                })()}

                {/* Resumé Documents */}
                {detail.resumes && detail.resumes.length > 0 && (
                  <AnimatedSection delay={0.15}>
                    <SectionCard icon={FileText} title="Resumé Documents">
                      <div className="space-y-2">
                        {detail.resumes.map((resume, idx) => (
                          <div key={resume.file_url || idx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ fileName: resume.file_name || "Resume.pdf", fileUrl: resume.file_url })}
                              className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors flex-1 min-w-0"
                            >
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="flex flex-col min-w-0 flex-1 text-left">
                                <span className="truncate">{resume.file_name || "Resume.pdf"}</span>
                                <span className="text-[10px] font-normal text-muted-foreground">Click to preview document</span>
                              </div>
                              <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                            </button>
                            <a
                              href={resume.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors shrink-0"
                              title="Download Resume"
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </AnimatedSection>
                )}

                {/* Skills */}
                {detail.skills.length > 0 && (
                  <AnimatedSection delay={0.2}>
                    <SectionCard icon={Star} title="Skills">
                      <div className="flex flex-wrap gap-1.5">
                        {detail.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-xs font-medium px-2.5 py-0.5 rounded-md border border-border bg-muted/60 text-foreground"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </SectionCard>
                  </AnimatedSection>
                )}

                {/* Work Experience */}
                {detail.work_experience.length > 0 && (
                  <AnimatedSection delay={0.25}>
                    <SectionCard icon={Briefcase} title="Work Experience">
                      <div className="space-y-4">
                        {detail.work_experience.map((exp) => (
                          <div key={exp.id} className="border-l-2 border-primary/40 pl-3.5 py-0.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground text-xs">{exp.job_title}</h4>
                              <span className="text-[11px] text-muted-foreground">
                                {formatDateRange(exp.start_date, exp.end_date, exp.is_current_role)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                              {exp.company_name}
                              {exp.location ? ` • ${exp.location}` : ""}
                            </p>
                            {exp.job_description && (
                              <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-line leading-relaxed">
                                {exp.job_description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </AnimatedSection>
                )}

                {/* Education */}
                {detail.education?.length > 0 && (
                  <AnimatedSection delay={0.3}>
                    <SectionCard icon={GraduationCap} title="Education">
                      <div className="space-y-3">
                        {detail.education.map((edu, index) => (
                          <div key={index} className="border-l-2 border-border pl-3 py-0.5">
                            <h4 className="font-semibold text-foreground text-xs">{edu.school_name}</h4>
                            {edu.course_name && (
                              <p className="text-xs text-muted-foreground mt-0.5">{edu.course_name}</p>
                            )}
                            {(edu.start_date || edu.end_date) && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {formatDateRange(edu.start_date, edu.end_date)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </AnimatedSection>
                )}

                {/* Certifications */}
                {detail.certifications.length > 0 && (
                  <AnimatedSection delay={0.35}>
                    <SectionCard icon={AwardIcon} title="Certifications">
                      <div className="space-y-2.5">
                        {detail.certifications.map((cert) => (
                          <div key={cert.id} className="flex items-start justify-between gap-2 flex-wrap border-b border-border/50 pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-semibold text-foreground text-xs">{cert.certificate_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {cert.issuing_organization}
                                {formatDate(cert.issue_date) ? ` • ${formatDate(cert.issue_date)}` : ""}
                              </p>
                            </div>
                            {cert.credential_url && (
                              <a
                                href={cert.credential_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </AnimatedSection>
                )}
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No additional details available.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-card/90 backdrop-blur-md px-6 py-3.5 flex flex-row items-center justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} className="border-border">
            Close
          </Button>

          {/* AI Analysis Button */}
          <Button
            variant="outline"
            onClick={() => setAiModalOpen(true)}
            className="border-primary/40 hover:border-primary/80 hover:bg-primary/5 text-foreground font-semibold gap-1.5 shadow-2xs cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500/20" />
            {cachedAnalysis ? "View AI Analysis" : "Generate AI Analysis"}
          </Button>

          <Link href={`/vos-sync/client/messaging?freelancer_id=${activeApplicant?.user_id ?? ''}&job_id=${activeApplicant?.job_id ?? ''}`}>
            <Button variant="outline" className="border-border hover:bg-muted font-medium gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Message Applicant
            </Button>
          </Link>

          {status !== "HIRED" && status !== "REJECTED" && status !== "INTERVIEWING" && (
            <Button variant="outline" onClick={onUpdateStatus} className="border-border">
              Update Status
            </Button>
          )}

          {status === "SHORTLISTED" && (
            <Button
              onClick={onScheduleInterview}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
            >
              <CalendarPlus className="h-4 w-4" />
              Schedule Interview
            </Button>
          )}

          {status === "INTERVIEWING" && activeApplicant?.active_interview_id && (
            <Link href="/vos-sync/client/interviews">
              <Button
                variant="outline"
                className="border-border hover:bg-muted font-medium gap-1.5"
              >
                <CalendarPlus className="h-4 w-4 text-primary" />
                View Interview
              </Button>
            </Link>
          )}

          {status === "INTERVIEWING" && !activeApplicant?.active_interview_id && (
            <Button
              onClick={onScheduleInterview}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
            >
              <CalendarPlus className="h-4 w-4" />
              Schedule Interview
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* AI Candidate Evaluation Modal */}
      <ApplicantAiAnalysisModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        applicant={detail}
      />

      {/* Nested Document Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(openState) => !openState && setPreviewDoc(null)}>
        <DialogContent className="!w-[96vw] !max-w-[1600px] sm:!max-w-[1600px] !h-[92vh] p-0 flex flex-col z-[100] gap-0 overflow-hidden border-border bg-background">
          <DialogHeader className="px-6 py-3.5 border-b border-border flex flex-row items-center justify-between space-y-0 bg-card shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-4">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <DialogTitle className="text-sm font-bold truncate">
                {previewDoc?.fileName || "Document Preview"}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {previewDoc?.fileUrl && (
                <>
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Original
                  </a>
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.fileName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted/40 overflow-hidden relative">
            {previewDoc?.fileUrl && (
              <DocumentViewer
                fileUrl={previewDoc.fileUrl}
                fileName={previewDoc.fileName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}