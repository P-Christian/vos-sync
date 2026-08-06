// src/modules/client/applicants/components/BestMatchesTab.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarPlus,
  Eye,
  TrendingUp,
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

  useEffect(() => {
    if (loading || !job || applicants.length === 0) {
      setCandidateMatches([]);
      return;
    }

    // 1. Check Session Storage Cache
    const cached = getBestMatchCache(job.job_id, applicants.length, job.updated_at);
    if (cached && cached.candidates.length > 0) {
      setCandidateMatches(cached.candidates);

      // Populate rule matches map locally for breakdown details
      const map = new Map<number, MatchResult>();
      for (const applicant of applicants) {
        map.set(applicant.application_id, calculateMatch(job, applicant));
      }
      ruleMatchesMap.current = map;
      setProcessing(false);
      return;
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

  // Selected candidate's match results
  const selectedMatch = candidateMatches[selectedResultIndex] || candidateMatches[0];
  const selectedApplicant = applicants.find(
    (a) => a.application_id === selectedMatch.applicationId
  );
  const selectedRuleMatch = selectedApplicant
    ? ruleMatchesMap.current.get(selectedApplicant.application_id) || calculateMatch(job, selectedApplicant)
    : null;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-indigo-600 dark:text-indigo-400";
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    return "text-amber-600 dark:text-amber-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30";
    if (score >= 70) return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30";
    return "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30";
  };

  const initials = (name: string) => {
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── Left Column: Candidate List (Grid Span 7) ────── */}
      <div className="lg:col-span-7 space-y-3">
        <div className="p-2 bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between px-3.5">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Best Match Recommendations
          </span>
          <span className="text-xs text-zinc-500 font-semibold">
            {candidateMatches.length} candidate{candidateMatches.length !== 1 ? "s" : ""} evaluated
          </span>
        </div>

        <div className="space-y-3">
          {candidateMatches.map((cMatch, index) => {
            const applicantObj = applicants.find((a) => a.application_id === cMatch.applicationId);
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
                    : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
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
                      <div className="h-11 w-11 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/50 flex items-center justify-center">
                        {profileImage ? (
                          <Image
                            src={`/api/client/assets/${profileImage}`}
                            alt={applicantObj.applicant_name}
                            width={44}
                            height={44}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-xs text-zinc-500">
                            {initials(applicantObj.applicant_name)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 transition-colors">
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
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-2 leading-snug">
                        {cMatch.explanation}
                      </p>

                      {/* Candidate Meta Info */}
                      <div className="flex flex-wrap items-center gap-x-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                          {applicantObj.experience_years} years experience
                        </span>

                        {applicantObj.location && (
                          <>
                            <span className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                              {applicantObj.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <ChevronRight
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isSelected ? "text-indigo-500 translate-x-0.5" : "text-zinc-300 dark:text-zinc-700"
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
          <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md shadow-lg overflow-hidden">
            <div
              className={`h-1.5 w-full ${
                selectedMatch.finalScore >= 85
                  ? "bg-indigo-600"
                  : selectedMatch.finalScore >= 70
                  ? "bg-emerald-600"
                  : "bg-amber-500"
              }`}
            />

            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-zinc-200 dark:border-zinc-800">
                  {selectedMatch.finalScore >= 85
                    ? "Highly Recommended"
                    : selectedMatch.finalScore >= 70
                    ? "Good Match"
                    : "Potential Match"}
                </Badge>

                <div
                  className={`px-2.5 py-0.5 text-xs font-extrabold rounded-lg border ${getScoreBg(
                    selectedMatch.finalScore
                  )} ${getScoreColor(selectedMatch.finalScore)}`}
                >
                  {selectedMatch.finalScore}% Overall Score
                </div>
              </div>

              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {selectedApplicant.applicant_name}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 text-xs">
              {/* Recruiter Recommendation Summary */}
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Recruiter AI Evaluation
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
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
                      <div key={idx} className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{str}</span>
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
                      <div key={idx} className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{weak}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Breakdown details if available */}
              {selectedRuleMatch && (
                <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Technical Skills Match ({selectedRuleMatch.matchingSkills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRuleMatch.matchingSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-emerald-50 border border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] py-0.5 px-2 rounded-md"
                      >
                        ✓ {skill}
                      </Badge>
                    ))}
                    {selectedRuleMatch.missingSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="bg-rose-50/50 border border-rose-200/40 text-rose-600 dark:bg-rose-950/10 dark:text-rose-400 text-[10px] py-0.5 px-2 rounded-md"
                      >
                        • {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
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
                      className="flex-1 h-9 rounded-lg gap-1.5 bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-bold text-xs"
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
