// src/modules/client/applicants/components/BestMatchesTab.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { JobPosting } from "../../jobs/types";
import { Applicant } from "../types";
import { calculateMatch, MatchResult } from "../utils/matchEngine";
import { processBestMatchAI } from "../services/bestMatchAIService";
import {
  getBestMatchCache,
  setBestMatchCache,
  CandidateMatch,
} from "../hooks/useBestMatchCache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarPlus,
  Eye,
  MapPin,
  Briefcase,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Loader2,
} from "lucide-react";

interface BestMatchesTabProps {
  job: JobPosting;
  applicants: Applicant[];
  loading: boolean;
  onViewDetails: (applicant: Applicant) => void;
  onScheduleInterview: (applicant: Applicant) => void;
}

export default function BestMatchesTab({
  job,
  applicants,
  loading,
  onViewDetails,
  onScheduleInterview,
}: BestMatchesTabProps) {
  const [processing, setProcessing] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>("Finding Candidates...");
  const [candidateMatches, setCandidateMatches] = useState<CandidateMatch[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const isRunningRef = useRef<boolean>(false);

  // Map of applicant ID to deterministic MatchResult for detailed breakdown
  const ruleMatchesMap = useRef<Map<number, MatchResult>>(new Map());

  const selectedMatch = candidateMatches[selectedResultIndex] || candidateMatches[0];
  const selectedApplicant = useMemo(() => {
    if (!selectedMatch) return undefined;
    return applicants.find((a) => Number(a.application_id) === Number(selectedMatch.applicationId));
  }, [applicants, selectedMatch]);

  const selectedRuleMatch = useMemo(() => {
    if (!selectedApplicant || !job) return null;
    return calculateMatch(job, selectedApplicant);
  }, [selectedApplicant, job]);

  useEffect(() => {
    if (loading || !job || applicants.length === 0) {
      queueMicrotask(() => setCandidateMatches([]));
      return;
    }

    // 1. Check Session Storage Cache
    const cached = getBestMatchCache(job.job_id, applicants.length, job.updated_at);
    if (cached && cached.candidates.length > 0) {
      // Validate that cached candidates exist in the active applicants list
      const hasValidApplicants = cached.candidates.every((c) =>
        applicants.some((a) => Number(a.application_id) === Number(c.applicationId))
      );

      if (hasValidApplicants) {
        queueMicrotask(() => setCandidateMatches(cached.candidates));

        // Populate rule matches map locally for breakdown details
        const map = new Map<number, MatchResult>();
        for (const applicant of applicants) {
          map.set(Number(applicant.application_id), calculateMatch(job, applicant));
        }
        ruleMatchesMap.current = map;
        queueMicrotask(() => setProcessing(false));
        return;
      }
    }

    // 2. Prevent duplicate calls using concurrency lock
    if (isRunningRef.current) return;

    const runAnalysis = async () => {
      isRunningRef.current = true;
      setProcessing(true);

      try {
        const { candidateMatches: results, ruleMatches } = await processBestMatchAI(
          job,
          applicants,
          (step) => setProgressStep(step)
        );

        ruleMatchesMap.current = ruleMatches;
        setCandidateMatches(results);

        // Cache results in session storage
        setBestMatchCache(
          job.job_id,
          applicants.length,
          job.updated_at || new Date().toISOString(),
          results
        );
      } catch (err) {
        console.error("[BestMatchesTab] Analysis error:", err);
      } finally {
        setProcessing(false);
        isRunningRef.current = false;
      }
    };

    runAnalysis();
  }, [job, applicants, loading]);

  if (loading || processing) {
    const steps = ["Finding Candidates...", "Ranking Skills...", "Analyzing with Gemini..."];
    const currentStepIdx = steps.indexOf(progressStep);
    const progressPercent = Math.max(30, ((currentStepIdx + 1) / steps.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm max-w-md mx-auto">
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl mb-4 text-indigo-600 dark:text-indigo-400">
          <BrainCircuit className="h-7 w-7 animate-pulse" />
        </div>
        <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-base mb-1">
          {progressStep}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 text-center">
          Evaluating applicant qualifications and generating recruiter recommendations.
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mb-3">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Please wait a moment...</span>
        </div>
      </div>
    );
  }

  if (applicants.length === 0 || candidateMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white/40 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">No match data available</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Matches will be calculated as soon as candidates apply to this job.
        </p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-indigo-600 dark:text-indigo-400";
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    return "text-amber-600 dark:text-amber-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40";
    if (score >= 70) return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40";
    return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40";
  };

  const initials = (name?: string) => {
    if (!name || typeof name !== "string") return "AP";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "AP";
    return parts
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── Left Column: Candidate List (Grid Span 7) ────── */}
      <div className="lg:col-span-7 space-y-3">
        <div className="p-2.5 bg-muted/40 dark:bg-zinc-900/40 border border-border/80 rounded-xl flex items-center justify-between px-3.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Best Match Recommendations
          </span>
          <span className="text-xs text-muted-foreground font-semibold">
            {candidateMatches.length} candidate{candidateMatches.length !== 1 ? "s" : ""} evaluated
          </span>
        </div>

        <div className="space-y-3">
          {candidateMatches.map((cMatch, index) => {
            const applicantObj = applicants.find((a) => Number(a.application_id) === Number(cMatch.applicationId));
            if (!applicantObj) return null;

            const isSelected = selectedResultIndex === index;
            const profileImage = applicantObj.applicant_profile_image_url;

            return (
              <Card
                key={cMatch.applicationId}
                onClick={() => setSelectedResultIndex(index)}
                className={`
                  cursor-pointer transition-all duration-200 border relative overflow-hidden group
                  ${isSelected
                    ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-1 ring-indigo-500/30"
                    : "border-border/80 bg-card hover:shadow-md hover:border-border"
                  }
                `}
              >
                {/* Visual Accent bar on the left */}
                <div
                  className={`
                    absolute left-0 top-0 bottom-0 w-1 transition-all duration-300
                    ${cMatch.finalScore >= 85 ? "bg-indigo-500" : cMatch.finalScore >= 70 ? "bg-emerald-500" : "bg-amber-500"}
                  `}
                />

                <CardContent className="p-4 pl-5">
                  <div className="flex items-start gap-4">
                    {/* Candidate Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 overflow-hidden rounded-full bg-muted border border-border/60 flex items-center justify-center">
                        {profileImage ? (
                          <Image
                            src={`/api/client/assets/${profileImage}`}
                            alt={applicantObj.applicant_name}
                            width={44}
                            height={44}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-xs text-muted-foreground">
                            {initials(applicantObj.applicant_name)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {applicantObj.applicant_name}
                        </h4>

                        {/* Match Score Badge */}
                        <div
                          className={`px-2.5 py-0.5 rounded-full border text-xs font-extrabold flex items-center gap-1 ${getScoreBg(
                            cMatch.finalScore
                          )} ${getScoreColor(cMatch.finalScore)}`}
                        >
                          {cMatch.finalScore}% Match
                        </div>
                      </div>

                      {/* AI Recruiter Summary Line */}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
                        {cMatch.explanation}
                      </p>

                      {/* Candidate Meta Info */}
                      <div className="flex flex-wrap items-center gap-x-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" />
                          {applicantObj.experience_years} years experience
                        </span>

                        {applicantObj.location && (
                          <>
                            <span className="h-3 w-px bg-border" />
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                              {applicantObj.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <ChevronRight
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isSelected ? "text-indigo-500 translate-x-0.5" : "text-muted-foreground/40"
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Right Column: Selected Candidate Detailed Insights (Grid Span 5) ────── */}
      <div className="lg:col-span-5 lg:sticky lg:top-4">
        {selectedMatch && selectedApplicant ? (
          <Card className="border border-border/80 bg-card shadow-lg overflow-hidden  flex flex-col">
            <div
              className={`h-1.5 w-full shrink-0 ${
                selectedMatch.finalScore >= 85
                  ? "bg-indigo-600"
                  : selectedMatch.finalScore >= 70
                  ? "bg-emerald-600"
                  : "bg-amber-500"
              }`}
            />

            <CardHeader className="pb-3 border-b border-border/50 shrink-0">
              <div className="flex items-center justify-between gap-2 mb-3">
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-border">
                  {selectedMatch.finalScore >= 85
                    ? "Highly Recommended"
                    : selectedMatch.finalScore >= 70
                    ? "Good Match"
                    : "Potential Match"}
                </Badge>

                <div
                  className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${getScoreBg(
                    selectedMatch.finalScore
                  )} ${getScoreColor(selectedMatch.finalScore)}`}
                >
                  {selectedMatch.finalScore}% Overall Score
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-11 w-11 overflow-hidden rounded-full bg-muted border border-border/60 flex items-center justify-center shrink-0">
                  {selectedApplicant.applicant_profile_image_url ? (
                    <Image
                      src={`/api/client/assets/${selectedApplicant.applicant_profile_image_url}`}
                      alt={selectedApplicant.applicant_name}
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-xs text-muted-foreground">
                      {initials(selectedApplicant.applicant_name)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-bold text-foreground truncate">
                    {selectedApplicant.applicant_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{selectedApplicant.applicant_email}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between pt-4 text-xs space-y-4">
              <div className="space-y-4">
                {/* Recruiter Recommendation Summary */}
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    Recruiter AI Evaluation
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                    {selectedMatch.explanation}
                  </p>
                </div>

                {/* Strengths */}
                {selectedMatch.strengths && selectedMatch.strengths.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Key Strengths
                    </span>
                    <div className="space-y-1.5">
                      {selectedMatch.strengths.map((str, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-foreground/90">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs leading-snug">{str}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weaknesses / Gaps */}
                {selectedMatch.weaknesses && selectedMatch.weaknesses.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                      Development Areas / Gaps
                    </span>
                    <div className="space-y-1.5">
                      {selectedMatch.weaknesses.map((weak, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-foreground/90">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-xs leading-snug">{weak}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Breakdown details if available */}
                {selectedRuleMatch && (selectedRuleMatch.matchingSkills.length > 0 || selectedRuleMatch.missingSkills.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Technical Skills Match ({selectedRuleMatch.matchingSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRuleMatch.matchingSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] py-0.5 px-2 rounded-md"
                        >
                          ✓ {skill}
                        </Badge>
                      ))}
                      {selectedRuleMatch.missingSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] py-0.5 px-2 rounded-md"
                        >
                          • {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 py-4 mt-auto border-t border-border/50">
                <Button
                  onClick={() => onViewDetails(selectedApplicant)}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-lg font-semibold text-xs gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  View Profile
                </Button>

                {selectedApplicant.application_status !== "REJECTED" &&
                  selectedApplicant.application_status !== "HIRED" && (
                    <Button
                      onClick={() => onScheduleInterview(selectedApplicant)}
                      size="sm"
                      className="flex-1 h-9 rounded-lg gap-1.5 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Schedule Interview
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
