"use client";
// src/modules/client/campus-talent/CampusTalentModule.tsx

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Search,
  Building2,
  Users,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
  Briefcase,
  BookOpen,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import Image from "next/image";
import CompanyVerificationGuard from "@/modules/client/components/CompanyVerificationGuard";
import { CampusMatchResult } from "@/modules/matching-engine/campus/types";
import { RawJobPosting } from "@/modules/matching-engine/campus/requirementNormalizer";
import { CampusCandidate } from "@/modules/matching-engine/campus/types";
import StudentMatchTable from "./components/StudentMatchTable";
import StudentMatchDrawer from "./components/StudentMatchDrawer";
import SendInvitationDialog from "./components/SendInvitationDialog";

// ── Local Types ────────────────────────────────────────────────────────────────

interface School {
  school_id: number;
  school_name: string;
  school_type: string | null;
  school_logo_url: string | null;
  city_municipality: string | null;
  province: string | null;
  student_count: number;
  course_count: number;
}

type CampusView = "SCHOOLS" | "STUDENTS" | "MATCH";

// ── Helpers ────────────────────────────────────────────────────────────────────

function resolveSchoolLogoUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const t = value.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/api/assets/")) return t;
  if (t.startsWith("/assets/")) return `/api${t}`;
  if (t.startsWith("/")) return t;
  const parts = t.split("/");
  const fileId = parts[parts.length - 1];
  return fileId ? `/api/assets/${fileId}` : null;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Pipeline Loading Stages ───────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    title: "Running campus match pipeline...",
    subtitle: "Initializing deterministic match evaluation engine",
  },
  {
    title: "Extracting job requirement taxonomies...",
    subtitle: "Analyzing required competencies, education & experience levels",
  },
  {
    title: "Evaluating university curriculum alignment...",
    subtitle: "Cross-referencing course syllabus & transcript competencies",
  },
  {
    title: "Scoring candidates and generating AI insights...",
    subtitle: "Synthesizing deterministic match weights & Gemini evidence",
  },
  {
    title: "Finalizing candidate ranking...",
    subtitle: "Organizing verified talent roster ready for review",
  },
];

function MatchPipelineLoadingState({
  jobTitle,
  schoolName,
}: {
  jobTitle: string;
  schoolName: string;
}) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const currentStage = PIPELINE_STAGES[stageIndex];
  const progressPercent = Math.round(
    ((stageIndex + 1) / PIPELINE_STAGES.length) * 100
  );

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 max-w-lg mx-auto text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glowing icon pulse */}
      <div className="relative mb-6">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/25 flex items-center justify-center shadow-lg">
          <Sparkles className="h-7 w-7 text-primary animate-pulse" />
        </div>
      </div>

      {/* Dynamic Stage Text with Crossfade */}
      <div className="min-h-[64px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={stageIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-1"
          >
            <p className="text-base font-bold text-foreground">
              {currentStage.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentStage.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Target Info Pill */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 border border-border/80 px-3.5 py-1.5 rounded-full shadow-2xs">
        <span className="font-medium text-foreground">{schoolName}</span>
        <span>•</span>
        <span className="truncate max-w-[220px]">{jobTitle}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs mt-6 space-y-1.5">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "15%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            Stage {stageIndex + 1} of {PIPELINE_STAGES.length}
          </span>
          <span>{progressPercent}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Module ────────────────────────────────────────────────────────────────

export default function CampusTalentModule() {
  // ── View state ───────────────────────────────────────────────────────────
  const [view, setView] = useState<CampusView>("SCHOOLS");

  // ── School Discovery ─────────────────────────────────────────────────────
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // ── Student Roster ───────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState<CampusCandidate[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  // ── Job Selection ─────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<RawJobPosting[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<RawJobPosting | null>(null);

  const jobOptions = useMemo(
    () => jobs.map((job) => ({ value: String(job.job_id), label: job.job_title })),
    [jobs]
  );

  // ── Match Results ─────────────────────────────────────────────────────────
  const [matchResults, setMatchResults] = useState<CampusMatchResult[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // ── Drawer & Dialog ───────────────────────────────────────────────────────
  const [drawerResult, setDrawerResult] = useState<CampusMatchResult | null>(null);
  const [inviteTarget, setInviteTarget] = useState<CampusMatchResult | null>(null);

  // ── School Search ─────────────────────────────────────────────────────────
  const handleSchoolSearch = useCallback(async () => {
    setSchoolsLoading(true);
    setSchoolsError(null);
    try {
      const data = await fetchJson<{ data: School[] }>(
        `/api/client/campus-talent/schools?q=${encodeURIComponent(schoolQuery)}`
      );
      setSchools(data.data ?? []);
    } catch (e: unknown) {
      setSchoolsError(e instanceof Error ? e.message : "Failed to load schools.");
    } finally {
      setSchoolsLoading(false);
    }
  }, [schoolQuery]);

  // ── Select School → Load Students ─────────────────────────────────────────
  const handleSelectSchool = useCallback(async (school: School) => {
    setSelectedSchool(school);
    setView("STUDENTS");
    setStudentsLoading(true);
    setStudentsError(null);
    setCandidates([]);
    setMatchResults([]);
    setSelectedJob(null);

    try {
      const data = await fetchJson<{ data: CampusCandidate[] }>(
        `/api/client/campus-talent/schools/${school.school_id}/students`
      );
      setCandidates(data.data ?? []);
    } catch (e: unknown) {
      setStudentsError(e instanceof Error ? e.message : "Failed to load students.");
    } finally {
      setStudentsLoading(false);
    }

    // Load jobs in parallel
    setJobsLoading(true);
    try {
      const jobData = await fetchJson<{ data: RawJobPosting[] }>("/api/client/campus-talent/jobs");
      setJobs(jobData.data ?? []);
    } catch {
      // Jobs failing silently — user can retry via job picker
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // ── Run Match ─────────────────────────────────────────────────────────────
  const handleRunMatch = useCallback(async () => {
    if (!selectedJob || candidates.length === 0) return;
    setMatchLoading(true);
    setMatchError(null);
    setView("MATCH");
    try {
      const data = await fetchJson<{ results: CampusMatchResult[] }>(
        "/api/client/campus-talent/match",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: selectedJob, candidates }),
        }
      );
      setMatchResults(data.results ?? []);
    } catch (e: unknown) {
      setMatchError(e instanceof Error ? e.message : "Match failed.");
    } finally {
      setMatchLoading(false);
    }
  }, [selectedJob, candidates]);

  // ── Filtered students for student view ────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    if (!studentSearch.trim()) return candidates;
    const lower = studentSearch.toLowerCase();
    return candidates.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        (c.courseName?.toLowerCase().includes(lower) ?? false)
    );
  }, [candidates, studentSearch]);

  return (
    <CompanyVerificationGuard moduleName="Campus Talent">
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Campus Talent</h1>
              <p className="text-sm text-muted-foreground">
                Discover and match academic candidates from verified schools
              </p>
            </div>
          </div>

          {/* Breadcrumb */}
          {view !== "SCHOOLS" && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <button
                onClick={() => { setView("SCHOOLS"); setSelectedSchool(null); }}
                className="hover:text-foreground transition-colors"
              >
                Schools
              </button>
              {selectedSchool && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button
                    onClick={() => setView("STUDENTS")}
                    className={cn(
                      "hover:text-foreground transition-colors",
                      view === "STUDENTS" && "text-foreground font-medium"
                    )}
                  >
                    {selectedSchool.school_name}
                  </button>
                </>
              )}
              {view === "MATCH" && selectedJob && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">{selectedJob.job_title}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* ── School Discovery View ─────────────────────────────────────── */}
          {view === "SCHOOLS" && (
            <div className="space-y-6">
              <div className="flex gap-2 max-w-xl">
                <Input
                  placeholder="Search schools by name, city, or province..."
                  value={schoolQuery}
                  onChange={(e) => setSchoolQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSchoolSearch(); }}
                  className="flex-1"
                />
                <Button onClick={handleSchoolSearch} disabled={schoolsLoading}>
                  {schoolsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Search</span>
                </Button>
              </div>

              {schoolsError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {schoolsError}
                </div>
              )}

              {schools.length === 0 && !schoolsLoading && !schoolsError && (
                <div className="text-center py-16 text-muted-foreground">
                  <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Search for a school to get started</p>
                  <p className="text-sm mt-1">Find verified schools and browse their student rosters</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {schools.map((school, index) => (
                  <motion.button
                    key={school.school_id}
                    onClick={() => handleSelectSchool(school)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.26,
                      delay: Math.min(index * 0.04, 0.28),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileHover={{ y: -3, scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    className="text-left border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-accent/40 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg border border-border overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                        {resolveSchoolLogoUrl(school.school_logo_url) ? (
                          <Image
                            src={resolveSchoolLogoUrl(school.school_logo_url)!}
                            alt={school.school_name}
                            width={40}
                            height={40}
                            unoptimized
                            className="object-contain"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {school.school_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[school.city_municipality, school.province].filter(Boolean).join(", ")}
                        </p>
                        {school.school_type && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {school.school_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {school.student_count} students
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {school.course_count} courses
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* ── Students View ──────────────────────────────────────────────── */}
          {view === "STUDENTS" && (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-1 max-w-md">
                  <Input
                    placeholder="Filter students by name, email, or course..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  {/* Searchable Job selector */}
                  <div className="w-full sm:w-[320px] md:w-[380px] lg:w-[420px]">
                    <SearchableSelect
                      options={jobOptions}
                      value={selectedJob ? String(selectedJob.job_id) : ""}
                      onValueChange={(val) => {
                        const found = jobs.find((j) => String(j.job_id) === val);
                        if (found) setSelectedJob(found);
                      }}
                      placeholder={
                        jobsLoading
                          ? "Loading company jobs..."
                          : "Select job to match against..."
                      }
                      disabled={jobsLoading || jobs.length === 0}
                      className="h-9 text-xs sm:text-sm font-normal truncate"
                    />
                  </div>

                  <Button
                    onClick={handleRunMatch}
                    disabled={!selectedJob || candidates.length === 0 || matchLoading}
                    size="sm"
                    className="shrink-0"
                  >
                    {matchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1.5" />
                    )}
                    Run AI Match
                  </Button>
                </div>
              </div>

              {studentsError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {studentsError}
                </div>
              )}

              {studentsLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading students...
                </div>
              ) : (
                <StudentMatchTable
                  candidates={filteredCandidates}
                  matchResults={[]}
                  showScores={false}
                  onViewDetails={(r) => {
                    // In plain student view, construct a minimal result for drawer
                    setDrawerResult(r);
                  }}
                  onInvite={(r) => setInviteTarget(r)}
                />
              )}
            </div>
          )}

          {/* ── Match Results View ─────────────────────────────────────────── */}
          {view === "MATCH" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Match Results — {selectedJob?.job_title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {matchResults.filter((r) => r.eligibility.eligible).length} eligible of {matchResults.length} students ranked
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView("STUDENTS")}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Students
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunMatch}
                    disabled={matchLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-1", matchLoading && "animate-spin")} />
                    Re-run
                  </Button>
                </div>
              </div>

              {matchError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {matchError}
                </div>
              )}

              {matchLoading ? (
                <MatchPipelineLoadingState
                  jobTitle={selectedJob?.job_title ?? "Selected Position"}
                  schoolName={selectedSchool?.school_name ?? "Selected School"}
                />
              ) : (
                <StudentMatchTable
                  candidates={filteredCandidates}
                  matchResults={matchResults}
                  showScores
                  onViewDetails={(r) => setDrawerResult(r)}
                  onInvite={(r) => setInviteTarget(r)}
                />
              )}
            </div>
          )}
        </div>

        {/* Student Detail Drawer */}
        <StudentMatchDrawer
          result={drawerResult}
          onClose={() => setDrawerResult(null)}
          onInvite={(r) => { setDrawerResult(null); setInviteTarget(r); }}
        />

        {/* Send Invitation Dialog */}
        <SendInvitationDialog
          target={inviteTarget}
          jobTitle={selectedJob?.job_title ?? ""}
          schoolName={selectedSchool?.school_name ?? ""}
          onClose={() => setInviteTarget(null)}
          onSent={() => {
            // Refresh candidate list to reflect updated invitation_status
            if (selectedSchool) handleSelectSchool(selectedSchool);
            setInviteTarget(null);
          }}
        />
      </div>
    </CompanyVerificationGuard>
  );
}
