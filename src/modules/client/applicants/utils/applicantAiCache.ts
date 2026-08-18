// src/modules/client/applicants/utils/applicantAiCache.ts

export interface AlternativeJobMatch {
  job_id: number;
  job_title: string;
  match_score: number;
  reasoning: string;
}

export interface CandidateAiAnalysis {
  match_score: number;
  fit_level: "Strong Match" | "Good Match" | "Moderate Match" | "Potential Fit" | "Low Match";
  executive_summary: string;
  strengths: string[];
  gaps_or_considerations: string[];
  screening_assessment?: string | null;
  recommendation: string;
  alternative_job_recommendations?: AlternativeJobMatch[];
  analyzed_at: string;
}

const CACHE_PREFIX = "vos_applicant_ai_analysis_";

export function getCachedApplicantAnalysis(applicationId: number): CandidateAiAnalysis | null {
  if (typeof window === "undefined" || !applicationId) return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${applicationId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CandidateAiAnalysis;
  } catch {
    return null;
  }
}

export function setCachedApplicantAnalysis(
  applicationId: number,
  analysis: CandidateAiAnalysis
): void {
  if (typeof window === "undefined" || !applicationId || !analysis) return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${applicationId}`, JSON.stringify(analysis));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearCachedApplicantAnalysis(applicationId: number): void {
  if (typeof window === "undefined" || !applicationId) return;
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${applicationId}`);
  } catch {
    // Ignore
  }
}
