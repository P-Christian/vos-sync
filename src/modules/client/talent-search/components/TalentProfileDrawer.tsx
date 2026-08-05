"use client";

// src/modules/client/talent-search/components/TalentProfileDrawer.tsx

import React, { useState } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Briefcase, GraduationCap, Award, Link2, FileText,
  Send, BookmarkPlus, BookmarkCheck, Loader2, AlertCircle,   Download, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TalentProfile, MatchBreakdown } from "../types";
import { formatExperienceYears, formatDateRange, getInitials, matchScoreColor, getPlatformIcon, getImageUrl } from "../utils/talentUtils";

interface TalentProfileDrawerProps {
  open: boolean;
  profile: TalentProfile | null;
  matchScore?: number | null;
  matchBreakdown?: MatchBreakdown | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onToggleSave: (profile: TalentProfile) => void;
  onInvite: (profile: TalentProfile) => void;
  saving: boolean;
}

export default function TalentProfileDrawer({
  open,
  profile,
  matchScore,
  matchBreakdown,
  loading,
  error,
  onClose,
  onToggleSave,
  onInvite,
  saving,
}: TalentProfileDrawerProps) {
  const [tab, setTab] = useState("overview");

  const initials = profile ? getInitials(profile.name) : "";
  const scoreClass = matchScore !== undefined ? matchScoreColor(matchScore) : "";
  const avatarSrc = profile ? getImageUrl(profile.profile_image_url) : "";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800"
      >
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            <span className="text-sm text-zinc-400">Loading profile…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 px-8 text-center">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <span className="text-sm text-zinc-500">{error}</span>
          </div>
        )}

        {/* Profile */}
        {!loading && !error && profile && (
          <>
            {/* Cover / Header */}
            <div className="relative bg-gradient-to-br from-indigo-950 via-zinc-900 to-violet-950 px-6 pt-8 pb-6 shrink-0">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400 to-transparent pointer-events-none" />
              <SheetHeader className="relative z-10">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt={profile.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-2xl object-cover border-2 border-white/20 shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white font-bold text-xl border-2 border-white/20 shrink-0">
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-white text-lg font-bold leading-tight">
                      {profile.name}
                    </SheetTitle>
                    {profile.headline && (
                      <p className="text-indigo-200 text-sm mt-0.5 leading-snug">{profile.headline}</p>
                    )}
                    {profile.location && (
                      <p className="flex items-center gap-1 text-zinc-400 text-xs mt-1.5">
                        <MapPin className="h-3 w-3" />
                        {profile.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  {matchScore !== null && matchScore !== undefined && (
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1", scoreClass)}>
                      {matchScore}% Compatibility
                    </span>
                  )}
                  {profile.experience_years > 0 && (
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-xs">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {formatExperienceYears(profile.experience_years)}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs border",
                      profile.availability_status === "AVAILABLE" || profile.availability_status === "IMMEDIATELY_AVAILABLE"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-white/10 text-zinc-300 border-white/20"
                    )}
                  >
                    {profile.availability_status === "AVAILABLE" || profile.availability_status === "IMMEDIATELY_AVAILABLE"
                      ? "✓ Available"
                      : "Employed"}
                  </Badge>
                </div>
              </SheetHeader>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
              <Button
                id={`drawer-save-${profile.user_id}`}
                variant="outline"
                size="sm"
                onClick={() => onToggleSave(profile)}
                disabled={saving}
                className={cn(
                  "h-9 flex-1 rounded-xl text-sm gap-1.5",
                  profile.is_saved
                    ? "border-indigo-300 dark:border-indigo-700 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30"
                    : ""
                )}
              >
                {profile.is_saved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
                {profile.is_saved ? "Saved" : "Save Candidate"}
              </Button>
              <Button
                id={`drawer-invite-${profile.user_id}`}
                size="sm"
                onClick={() => onInvite(profile)}
                className="h-9 flex-1 rounded-xl text-sm gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-medium"
              >
                <Send className="h-4 w-4" />
                Send Invitation
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="flex shrink-0 mx-6 mt-3 h-9 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
                <TabsTrigger value="overview" className="flex-1 text-xs rounded-lg">Overview</TabsTrigger>
                <TabsTrigger value="experience" className="flex-1 text-xs rounded-lg">Experience</TabsTrigger>
                <TabsTrigger value="education" className="flex-1 text-xs rounded-lg">Education</TabsTrigger>
                <TabsTrigger value="portfolio" className="flex-1 text-xs rounded-lg">Portfolio</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-6 pb-8">
                {/* ── OVERVIEW ── */}
                <TabsContent value="overview" className="mt-4 space-y-5">
                  {/* Browse Mode Helper Banner */}
                  {!matchBreakdown && (
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-0.5">
                        Compatibility Score
                      </span>
                      Search for a role, select required skills, or choose a job posting to evaluate candidate match.
                    </div>
                  )}

                  {/* Match Breakdown Card */}
                  {matchBreakdown && (
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                          Candidate Compatibility Breakdown
                        </h4>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                          {matchBreakdown.overallScore}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[11px]">Skills (45%)</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{matchBreakdown.skills} / 45 pts</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[11px]">Relevant Exp (20%)</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            {matchBreakdown.experience.score} / 20 pts
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-medium">
                              ({matchBreakdown.experience.relevantYears} yrs relevant)
                            </span>
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[11px]">Education (10%)</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{matchBreakdown.education} / 10 pts</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[11px]">Certifications (10%)</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{matchBreakdown.certifications} / 10 pts</span>
                        </div>
                      </div>

                      {/* Matched vs Ignored roles breakdown */}
                      {(matchBreakdown.experience.matchedRoles.length > 0 || matchBreakdown.experience.ignoredRoles.length > 0) && (
                        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1.5">
                          {matchBreakdown.experience.matchedRoles.length > 0 && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓ Relevant Roles:</span>
                              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                                {matchBreakdown.experience.matchedRoles.join(", ")}
                              </span>
                            </div>
                          )}
                          {matchBreakdown.experience.ignoredRoles.length > 0 && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-zinc-400 font-medium shrink-0">✕ Unrelated Roles:</span>
                              <span className="text-zinc-500 dark:text-zinc-400 line-through">
                                {matchBreakdown.experience.ignoredRoles.join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Summary */}
                  {profile.summary && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Professional Summary</h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{profile.summary}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Skills */}
                  {profile.skills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded-full text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal details */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Details</h4>
                    <div className="space-y-2 text-sm">
                      {profile.email && (
                        <div className="flex gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="text-zinc-400 w-20 shrink-0 text-xs font-medium">Email</span>
                          <span className="truncate">{profile.email}</span>
                        </div>
                      )}
                      {profile.expected_salary && (
                        <div className="flex gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="text-zinc-400 w-20 shrink-0 text-xs font-medium">Expected</span>
                          <span>₱{profile.expected_salary.toLocaleString()}</span>
                        </div>
                      )}
                      {profile.nationality && (
                        <div className="flex gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="text-zinc-400 w-20 shrink-0 text-xs font-medium">Nationality</span>
                          <span>{profile.nationality}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ── EXPERIENCE ── */}
                <TabsContent value="experience" className="mt-4 space-y-4">
                  {profile.work_experience.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-8">No work experience listed.</p>
                  ) : (
                    profile.work_experience.map((exp) => (
                      <div key={exp.id} className="relative pl-5 border-l-2 border-indigo-200 dark:border-indigo-800 pb-4 last:pb-0">
                        <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-zinc-900" />
                        <p className="font-semibold text-sm text-zinc-900 dark:text-white">{exp.job_title}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{exp.company_name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {formatDateRange(exp.start_date, exp.end_date, exp.is_current_role)}
                          {exp.employment_type && ` · ${exp.employment_type}`}
                        </p>
                        {exp.location && (
                          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {exp.location}
                          </p>
                        )}
                        {exp.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed line-clamp-3">{exp.description}</p>
                        )}
                        {exp.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {exp.skills.map((s) => (
                              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* ── EDUCATION ── */}
                <TabsContent value="education" className="mt-4 space-y-4">
                  {/* Education */}
                  {profile.education.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Education
                      </h4>
                      <div className="space-y-3">
                        {profile.education.map((edu) => (
                          <div key={edu.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-white">{edu.school_name ?? "—"}</p>
                            {edu.course_name && (
                              <p className="text-xs text-indigo-600 dark:text-indigo-400">{edu.course_name}</p>
                            )}
                            {(edu.start_date || edu.end_date) && (
                              <p className="text-xs text-zinc-400 mt-0.5">
                                {formatDateRange(edu.start_date, edu.end_date, false)}
                              </p>
                            )}
                            {edu.school_location && (
                              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {edu.school_location}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {profile.certifications.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                        <Award className="h-3.5 w-3.5" />
                        Certifications
                      </h4>
                      <div className="space-y-2">
                        {profile.certifications.map((cert) => (
                          <div key={cert.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-white">{cert.certificate_name}</p>
                            <p className="text-xs text-zinc-500">{cert.issuing_organization}</p>
                            {cert.issue_date && (
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Issued {new Date(cert.issue_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                              </p>
                            )}
                            {cert.credential_url && (
                              <a
                                href={cert.credential_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View credential
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.education.length === 0 && profile.certifications.length === 0 && (
                    <p className="text-sm text-zinc-400 text-center py-8">No education records listed.</p>
                  )}
                </TabsContent>

                {/* ── PORTFOLIO ── */}
                <TabsContent value="portfolio" className="mt-4 space-y-5">
                  {/* Social Links */}
                  {profile.social_links.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5" />
                        Links &amp; Portfolio
                      </h4>
                      <div className="space-y-2">
                        {profile.social_links.map((link) => (
                          <a
                            key={link.id}
                            href={link.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
                          >
                            <span className="text-lg">{getPlatformIcon(link.platform_name)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{link.platform_name}</p>
                              <p className="text-xs text-zinc-400 truncate">{link.profile_url}</p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resumes */}
                  {profile.resumes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Resumes
                      </h4>
                      <div className="space-y-2">
                        {profile.resumes.map((resume) => (
                          <div
                            key={resume.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                          >
                            <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                                {resume.file_name ?? "Resume"}
                              </p>
                              {resume.is_primary && (
                                <span className="text-xs text-indigo-500">Primary</span>
                              )}
                            </div>
                            <a
                              href={resume.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs rounded-lg gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.social_links.length === 0 && profile.resumes.length === 0 && (
                    <p className="text-sm text-zinc-400 text-center py-8">No portfolio links or resumes uploaded.</p>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
