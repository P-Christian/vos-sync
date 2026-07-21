// src/modules/client/applicants/components/ApplicantDetailsModal.tsx
"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import React from "react";
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
    MessageSquare,
} from "lucide-react";
import { Applicant, ApplicationStatus, CandidateDetail, STATUS_LABELS } from "../types";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
    APPLIED: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
    SHORTLISTED: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
    INTERVIEW_SCHEDULED: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
    HIRED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
    REJECTED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
};

function initials(name?: string) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0][0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

function timeAgo(dateStr?: string): string {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}
function AnimatedSection({
    children,
    delay = 0,
}: {
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
            }}
            transition={{
                duration: 0.25,
                delay,
                ease: "easeOut",
            }}
        >
            {children}
        </motion.div>
    );
}

function formatDate(dateStr?: string | null): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateRange(start?: string | null, end?: string | null, current?: boolean): string {
    const s = formatDate(start) ?? "—";
    const e = current ? "Present" : formatDate(end) ?? "Present";
    return `${s} – ${e}`;
}

function formatCurrency(value?: number | null): string | null {
    if (value === null || value === undefined) return null;
    try {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return `₱${value.toLocaleString()}`;
    }
}


function Section({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                <Icon className="h-3.5 w-3.5" />
                {title}
            </div>
            <div className="text-sm text-zinc-700 dark:text-zinc-300">{children}</div>
        </div>
    );
}

function getDelays(visibilities: boolean[], baseDelay = 0.1): number[] {
    let count = 0;
    return visibilities.map((visible) => {
        if (visible) {
            count++;
            return count * baseDelay;
        }
        return 0;
    });
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
    const [imageLoaded, setImageLoaded] = React.useState(false);
    if (!applicant) return null;



    const name = applicant.applicant_name ?? `Applicant #${applicant.application_id}`;
    const status: ApplicationStatus = detail?.application_status ?? applicant.application_status;
    const jobTitle = detail?.job_title ?? applicant.job_title ?? "—";

    const appliedAt = detail?.applied_at ?? applicant.applied_at;
    const canSchedule = status !== "REJECTED" && status !== "HIRED";
    const expectedSalary = formatCurrency(detail?.expected_salary ?? null);
    const profileImage = detail?.profile_image ?? applicant.profile_image_url;

    const profileCompletion =
        detail?.profile_completion ??
        applicant.profile_completion ??
        0;

    const screeningEntries = detail?.screening_answers?.filter((a) => a.answer_text?.trim()) ?? [];
    const visibilities = [
        true, // Profile Metrics (0)
        !!detail, // Contact (1)
        !!detail && (!!detail.profile_headline || !!detail.professional_summary), // Summary (2)
        !!detail && !!detail.cover_letter, // Cover Letter (3)
        !!detail && (!!detail.portfolio_url || !!detail.resumes?.length || !!expectedSalary), // Salary (4)
        !!detail && detail.skills.length > 0, // Skills (5)
        !!detail && detail.work_experience.length > 0, // Work Experience (6)
        !!detail && detail.education?.length > 0, // Education (7)
        !!detail && detail.certifications.length > 0, // Certifications (8)
        !!detail && screeningEntries.length > 0, // Screening (9)
        !!detail && detail.social_links?.length > 0, // Social Links (10)
        !!detail && !!detail.client_notes, // Client Notes (11)
    ];
    const delays = getDelays(visibilities);
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] !max-w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col">
                {/* Sticky header */}
                <div className="shrink-0 border-b bg-background px-6 py-5">
                    <DialogHeader>
                        <div className="flex items-start gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-primary/10 ">
                                {!imageLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center font-semibold text-sm text-primary">
                                        {initials(name)}
                                    </div>
                                )}

                                {profileImage && (
                                    <Image
                                        src={`/api/client/assets/${profileImage}`}
                                        width={64}
                                        height={64}
                                        alt={name}
                                        onLoad={() => setImageLoaded(true)}
                                        className={`
                h-full
                w-full
                object-cover
                transition-opacity
                duration-600
                ease-out
                ${imageLoaded ? "opacity-100" : "opacity-0"}
            `}
                                    />
                                )}
                            </div>
                            <motion.div
                                key={applicant.application_id}
                                className="min-w-0 flex-1"
                                initial={{
                                    opacity: 0,
                                    x: 5,
                                }}
                                animate={{
                                    opacity: 1,
                                    x: 0,
                                }}
                                transition={{
                                    duration: 0.35,
                                    ease: "easeOut",
                                }}
                            >
                                <div className="min-w-0 flex-1">
                                    <DialogTitle className="text-lg font-bold flex items-center gap-2 flex-wrap ">
                                        <span>{name}</span>

                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}
                                        >
                                            {STATUS_LABELS[status]}
                                        </Badge>
                                    </DialogTitle>

                                    <p className="text-sm text-zinc-500 mt-1 flex flex-wrap gap-4">
                                        <span className="flex items-center gap-1">
                                            <Briefcase className="h-4 w-4" />
                                            {jobTitle}
                                        </span>

                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            Applied {timeAgo(appliedAt)}
                                        </span>
                                    </p>
                                </div>
                            </motion.div>
                        </div>


                    </DialogHeader>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto scroll-smooth px-6 py-5 space-y-5 [scrollbar-gutter:stable]">

                    {/* Profile Metrics */}
                    <AnimatedSection delay={delays[0]}>
                        <Section icon={LandPlot} title="Profile Metrics">
                            <div className="grid grid-cols-2 gap-3 ">

                                <div className="rounded-lg border p-3">
                                    <p className="text-xs text-zinc-500">
                                        Profile Completion
                                    </p>

                                    <p className="text-lg font-semibold">
                                        {profileCompletion}%
                                    </p>
                                </div>


                                <div className="rounded-lg border p-3">
                                    <p className="text-xs text-zinc-500">
                                        Experience
                                    </p>

                                    <p className="text-lg font-semibold">
                                        {detail?.experience_years ??
                                            applicant.experience_years} yrs
                                    </p>
                                </div>


                                <div className="rounded-lg border p-3">
                                    <p className="text-xs text-zinc-500">
                                        Work Records
                                    </p>

                                    <p className="text-lg font-semibold">
                                        {detail?.work_experience_count ??
                                            applicant.work_experience_count}
                                    </p>
                                </div>


                                <div className="rounded-lg border p-3">
                                    <p className="text-xs text-zinc-500">
                                        Resumes
                                    </p>

                                    <p className="text-lg font-semibold">
                                        {detail?.resume_count ??
                                            applicant.resume_count}
                                    </p>
                                </div>

                            </div>
                        </Section>

                    </AnimatedSection>
                    {error && (
                        <div className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200/50 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {loading && !detail ? (
                        <div className="space-y-3 py-6">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
                                    style={{
                                        width: `${72 - i * 10}%`,
                                    }}
                                />
                            ))}
                        </div>
                    ) : detail ? (
                        <div className="space-y-5">

                            {/* Contact */}
                            <AnimatedSection delay={delays[1]}>
                                <Section icon={Contact} title="Contact">
                                    <div className="space-y-1 px-2">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                                            <span className="break-all">
                                                {detail.applicant_email || "—"}
                                            </span>
                                        </div>

                                        {detail.applicant_phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                                                {detail.applicant_phone}
                                            </div>
                                        )}

                                        {detail.location && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                                                {detail.location}
                                            </div>
                                        )}
                                    </div>
                                </Section>
                            </AnimatedSection>

                            {/* Headline & Summary */}
                            {(detail.profile_headline || detail.professional_summary) && (
                                <AnimatedSection delay={delays[2]}>
                                    <Section icon={User2} title="Professional Summary">
                                        {detail.profile_headline && (
                                            <p className="font-medium text-zinc-800 dark:text-zinc-200 px-2">{detail.profile_headline}</p>
                                        )}
                                        {detail.professional_summary && (
                                            <p className="mt-1 text-zinc-600 dark:text-zinc-400 whitespace-pre-line px-2">
                                                {detail.professional_summary}
                                            </p>
                                        )}
                                    </Section>
                                </AnimatedSection>
                            )}

                            {/* Cover letter */}
                            {detail.cover_letter && (
                                <AnimatedSection delay={delays[3]}>
                                    <Section icon={LetterText} title="Cover Letter">
                                        <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400 px-2">{detail.cover_letter}</p>
                                    </Section>
                                </AnimatedSection>
                            )}

                            {/* Resume, portfolio, salary */}
                            {(
                                detail.portfolio_url ||
                                detail.resumes?.length ||
                                expectedSalary
                            ) && (
                                    <AnimatedSection delay={delays[4]}>
                                        <Section icon={Banknote} title="Expected Salary">
                                            <div className="flex flex-wrap gap-2">
                                                {detail.resumes?.map((resume) => (
                                                    <a
                                                        key={resume.file_url}
                                                        href={resume.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        {resume.file_name || "Resume"}
                                                    </a>
                                                ))}
                                                {detail.portfolio_url && (
                                                    <a
                                                        href={detail.portfolio_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Portfolio
                                                    </a>
                                                )}
                                                {expectedSalary && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                        <Wallet className="h-3.5 w-3.5" />
                                                        {expectedSalary} expected
                                                    </span>
                                                )}
                                            </div>
                                        </Section>
                                    </AnimatedSection>
                                )}

                            {/* Skills */}
                            {detail.skills.length > 0 && (
                                <AnimatedSection delay={delays[5]}>
                                    <Section icon={Star} title="Skills">
                                        <div className="flex flex-wrap gap-1.5">
                                            {detail.skills.map((skill) => (
                                                <Badge
                                                    key={skill}
                                                    variant="outline"
                                                    className="text-[11px] font-medium px-2 py-0.5 rounded-full border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                                                >
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </Section>
                                </AnimatedSection>
                            )}

                            {/* Work experience */}
                            {detail.work_experience.length > 0 && (
                                <AnimatedSection delay={delays[6]}>
                                    <Section icon={Briefcase} title="Work Experience">
                                        <div className="space-y-3">
                                            {detail.work_experience.map((exp) => (
                                                <div key={exp.id} className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-3">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{exp.job_title}</p>
                                                        <span className="text-[11px] text-zinc-400">
                                                            {formatDateRange(exp.start_date, exp.end_date, exp.is_current_role)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {exp.company_name}
                                                        {exp.location ? ` • ${exp.location}` : ""}
                                                    </p>
                                                    {exp.job_description && (
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 whitespace-pre-line">
                                                            {exp.job_description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                </AnimatedSection>
                            )}

                            {/* Education */}
                            {detail.education?.length > 0 && (
                                <AnimatedSection delay={delays[7]}>
                                    <Section icon={GraduationCap} title="Education">
                                        <div className="space-y-3">
                                            {detail.education.map((edu, index) => (
                                                <div key={index}>
                                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                                        {edu.school_name}
                                                    </p>

                                                    {edu.course_name && (
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            {edu.course_name}
                                                        </p>
                                                    )}

                                                    {(edu.start_date || edu.end_date) && (
                                                        <p className="text-[11px] text-zinc-400 mt-1">
                                                            {formatDateRange(
                                                                edu.start_date,
                                                                edu.end_date
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                </AnimatedSection>
                            )}

                            {/* Certifications */}
                            {detail.certifications.length > 0 && (
                                <AnimatedSection delay={delays[8]}>
                                    <Section icon={AwardIcon} title="Certifications">
                                        <div className="space-y-2">
                                            {detail.certifications.map((cert) => (
                                                <div key={cert.id} className="flex items-start justify-between gap-2 flex-wrap">
                                                    <div>
                                                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{cert.certificate_name}</p>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            {cert.issuing_organization}
                                                            {formatDate(cert.issue_date) ? ` • ${formatDate(cert.issue_date)}` : ""}
                                                        </p>
                                                    </div>
                                                    {cert.credential_url && (
                                                        <a
                                                            href={cert.credential_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                                                        >
                                                            View <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                </AnimatedSection>
                            )}

                            {/* Screening answers */}
                            {screeningEntries.length > 0 && (
                                <AnimatedSection delay={delays[9]}>
                                    <Section icon={BadgeQuestionMark} title="Screening Answers">
                                        <div className="space-y-2">
                                            {screeningEntries.map((item) => (
                                                <div key={item.question_id}>
                                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.question_text}</p>
                                                    <p className="text-zinc-700 dark:text-zinc-300">{item.answer_text || "—"}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                </AnimatedSection>
                            )}
                            {detail.social_links?.length > 0 && (
                                <AnimatedSection delay={delays[10]}>
                                    <Section icon={Mail} title="Contact">
                                        <div className="flex flex-wrap gap-2">
                                            {detail.social_links.map((link, index) => (
                                                <a
                                                    key={index}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    {link.platform}
                                                </a>
                                            ))}
                                        </div>
                                    </Section>
                                </AnimatedSection>
                            )}
                            {/* Client notes */}
                            {detail.client_notes && (
                                <AnimatedSection delay={delays[11]}>
                                    <Section icon={NotebookText} title="Client Notes">
                                        <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">{detail.client_notes}</p>
                                    </Section>
                                </AnimatedSection>
                            )}
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-zinc-400">
                            No additional details available.
                        </p>
                    )}
                </div>
                {/* FOOTER */}
                <DialogFooter className="sticky bottom-0 z-20 shrink-0 border-t bg-background px-6 py-4">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>

                    <Link href={`/vos-sync/client/messaging?freelancer_id=${applicant.user_id}&job_id=${applicant.job_id}`}>
                        <Button variant="outline" className="border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50">
                            <MessageSquare className="h-4 w-4" />
                            Message Applicant
                        </Button>
                    </Link>

                    <Button variant="outline" onClick={onUpdateStatus}>
                        Update Status
                    </Button>
                    {canSchedule && (
                        <Button
                            onClick={onScheduleInterview}
                            className="bg-[#14a800] hover:bg-[#118f00]"
                        >
                            <CalendarPlus className="h-4 w-4" />
                            Schedule Interview
                        </Button>
                    )}
                </DialogFooter>

            </DialogContent>
        </Dialog >
    );
}