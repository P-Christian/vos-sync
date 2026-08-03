// src/modules/client/applicants/components/BestMatchesTab.tsx
"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { JobPosting } from "../../jobs/types";
import { Applicant } from "../types";
import { calculateMatch } from "../utils/matchEngine";
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
  // Compute match results for all applicants
  const matchResults = useMemo(() => {
    return applicants
      .map((applicant) => {
        const match = calculateMatch(job, applicant);
        return {
          applicant,
          match,
        };
      })
      // Sort by highest overall score first
      .sort((a, b) => b.match.overallScore - a.match.overallScore);
  }, [job, applicants]);

  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);

  // Selected candidate's match results
  const selectedResult = matchResults[selectedResultIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-zinc-400 animate-pulse">Calculating best matches...</span>
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white/40 dark:bg-zinc-950/40 rounded-2xl border border-zinc-150 dark:border-zinc-800">
        {/* <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4 text-[#14a800]">
          <Sparkles className="h-8 w-8 animate-pulse" />
        </div> */}
        <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">No match data available</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Matches will be calculated as soon as candidates apply to this job.
        </p>
      </div>
    );
  }

  const badgeColors: Record<string, string> = {
    highly_recommended: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-400",
    good_match: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
    potential_match: "bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400",
  };

  const badgeTextGradients: Record<string, string> = {
    highly_recommended: "from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400",
    good_match: "from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400",
    potential_match: "from-zinc-600 to-zinc-800 dark:from-zinc-400 dark:to-zinc-300",
  };

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
        <div className="p-1.5 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-850 rounded-xl flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Candidates sorted by best fit
          </span>
          <span className="text-xs text-zinc-500 font-medium">
            {applicants.length} matching profile{(applicants.length !== 1) ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3">
          {matchResults.map(({ applicant, match }, index) => {
            const isSelected = selectedResultIndex === index;
            const profileImage = applicant.applicant_profile_image_url;

            return (
              <Card
                key={applicant.application_id}
                onClick={() => setSelectedResultIndex(index)}
                className={`
                  cursor-pointer transition-all duration-200 border relative overflow-hidden group
                  ${isSelected 
                    ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-md ring-1 ring-indigo-500/30" 
                    : "border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
                  }
                `}
              >
                {/* Visual Accent bar on the left */}
                <div
                  className={`
                    absolute left-0 top-0 bottom-0 w-1 transition-all duration-300
                    ${match.overallScore >= 85 ? "bg-indigo-500" : match.overallScore >= 70 ? "bg-emerald-500" : "bg-zinc-400"}
                  `}
                />

                <CardContent className="p-4 pl-5">
                  <div className="flex items-start gap-4">
                    {/* Candidate Avatar */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/30 flex items-center justify-center">
                      {profileImage ? (
                        <Image
                          src={`/api/client/assets/${profileImage}`}
                          alt={applicant.applicant_name}
                          width={44}
                          height={44}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-xs text-zinc-500">
                          {initials(applicant.applicant_name)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 transition-colors">
                          {applicant.applicant_name}
                        </h4>
                        
                        {/* Match Score Badge */}
                        <div className={`px-2.5 py-0.5 rounded-full border text-xs font-extrabold flex items-center gap-1 ${getScoreBg(match.overallScore)} ${getScoreColor(match.overallScore)}`}>
                         
                          {match.overallScore}% Match
                        </div>
                      </div>

                      {/* Candidate details preview */}
                      <div className="flex flex-wrap items-center gap-x-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                          {applicant.experience_years} years experience
                        </span>
                        
                        {applicant.location && (
                          <>
                            <span className="h-3 w-px bg-zinc-250 dark:bg-zinc-850" />
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                              {applicant.location}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Matching Skills tag preview */}
                      {match.matchingSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-3">
                          {match.matchingSkills.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-[10px] font-semibold py-0.5 px-2 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30"
                            >
                              ✓ {skill}
                            </Badge>
                          ))}
                          {match.matchingSkills.length > 3 && (
                            <span className="text-[10px] text-zinc-400 font-bold ml-1">
                              +{match.matchingSkills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center shrink-0">
                      <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${isSelected ? "text-indigo-500 translate-x-0.5" : "text-zinc-300 dark:text-zinc-700"}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Right Column: Match Breakdown & Details (Grid Span 5) ────── */}
      <div className="lg:col-span-5 lg:sticky lg:top-4">
        {selectedResult ? (
          <Card className="border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-xl overflow-hidden">
            
            {/* Gradient Highlight Header */}
            <div className={`h-2 w-full bg-gradient-to-r ${badgeTextGradients[selectedResult.match.badge.variant]}`} />

            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`px-2.5 py-0.5 font-bold border text-[10px] rounded-full uppercase tracking-wider ${badgeColors[selectedResult.match.badge.variant]}`}>
                  {selectedResult.match.badge.label}
                </Badge>
                
                <div className={`px-2 py-0.5 text-xs font-bold rounded-lg border flex items-center gap-1 ml-auto ${getScoreBg(selectedResult.match.overallScore)} ${getScoreColor(selectedResult.match.overallScore)}`}>
                  {selectedResult.match.overallScore}% Fit
                </div>
              </div>

              <CardTitle className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">
                {selectedResult.applicant.applicant_name}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {selectedResult.match.badge.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              
              {/* Match Breakdown Section */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Fit Breakdown
                </h5>

                <div className="space-y-2.5 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-900/40 p-4 rounded-2xl">
                  {/* Skill Fit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-600 dark:text-zinc-400">Technical Skills</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">{selectedResult.match.breakdown.skills}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedResult.match.breakdown.skills}%` }} />
                    </div>
                  </div>

                  {/* Experience Fit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-600 dark:text-zinc-400">Experience Alignment</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">{selectedResult.match.breakdown.experience}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedResult.match.breakdown.experience}%` }} />
                    </div>
                  </div>

                  {/* Location Fit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-600 dark:text-zinc-400">Location & Work Arrangement</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">{selectedResult.match.breakdown.location}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedResult.match.breakdown.location}%` }} />
                    </div>
                  </div>

                  {/* Education Fit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-600 dark:text-zinc-400">Education Level</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">{selectedResult.match.breakdown.education}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedResult.match.breakdown.education}%` }} />
                    </div>
                  </div>

                  {/* Screening Questions Fit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-600 dark:text-zinc-400">Screening Completion</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">{selectedResult.match.breakdown.screening}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedResult.match.breakdown.screening}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Analysis */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                 
                  Skills Comparison
                </h5>

                <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-900/40 p-4 rounded-2xl">
                  {/* Matching Skills */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block mb-1.5 uppercase">
                      Matching Skills ({selectedResult.match.matchingSkills.length})
                    </span>
                    {selectedResult.match.matchingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedResult.match.matchingSkills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="bg-emerald-100/50 border border-emerald-200/50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 text-[10px] font-semibold py-0.5 px-2 rounded-lg"
                          >
                            ✓ {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic block">No exact matching skills.</span>
                    )}
                  </div>

                  {/* Related / Might Have Skills */}
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1.5 uppercase">
                      Related / Might Have Skills ({selectedResult.match.relatedSkills?.length || 0})
                    </span>
                    {selectedResult.match.relatedSkills && selectedResult.match.relatedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedResult.match.relatedSkills.map((rel, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            title={rel.reason}
                            className="bg-indigo-50/70 border border-indigo-200/60 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/40 text-[10px] font-semibold py-0.5 px-2 rounded-lg cursor-help"
                          >
                            ⚡ {rel.requiredSkill}{" "}
                            <span className="text-[9px] font-normal opacity-80">(has {rel.candidateSkill})</span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic block">No related skill matches.</span>
                    )}
                  </div>

                  {/* Missing Skills */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block mb-1.5 uppercase">
                      Missing Skills ({selectedResult.match.missingSkills.length})
                    </span>
                    {selectedResult.match.missingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedResult.match.missingSkills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="bg-rose-50/30 border border-rose-200/40 text-rose-700 dark:bg-rose-950/10 dark:text-rose-450 dark:border-rose-900/30 text-[10px] font-semibold py-0.5 px-2 rounded-lg"
                          >
                            • {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic block">None! Meets all skill requirements.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra Alignment Indicators */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100 dark:border-zinc-900/40 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block mb-0.5 uppercase">Experience Fit</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {selectedResult.applicant.experience_years} years (Req: {job.experience_level || "Any"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block mb-0.5 uppercase">Location Match</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {selectedResult.match.breakdown.location >= 100 ? "Perfect Match" : "Acceptable Fit"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onViewDetails(selectedResult.applicant)}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-lg font-semibold text-xs gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  View Profile
                </Button>

                {selectedResult.applicant.application_status !== "REJECTED" &&
                selectedResult.applicant.application_status !== "HIRED" && (
                  <Button
                    onClick={() => onScheduleInterview(selectedResult.applicant)}
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
