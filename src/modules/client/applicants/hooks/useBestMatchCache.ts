// src/modules/client/applicants/hooks/useBestMatchCache.ts
"use client";

export interface CandidateMatch {
  applicationId: number;
  ruleScore: number;
  aiScore: number;
  finalScore: number;
  explanation: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CachedBestMatch {
  jobId: number;
  applicantCount: number;
  jobUpdatedAt: string;
  generatedAt: string;
  model: string;
  version: string;
  candidates: CandidateMatch[];
}

const CACHE_PREFIX = "vos_sync_best_matches_";
const CURRENT_CACHE_VERSION = "v2";

export function getBestMatchCache(
  jobId: number,
  currentApplicantCount: number,
  jobUpdatedAt?: string
): CachedBestMatch | null {
  if (typeof window === "undefined" || !jobId) return null;

  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${jobId}`);
    if (!raw) return null;

    const cached: CachedBestMatch = JSON.parse(raw);

    // Invalidation checks
    if (cached.version !== CURRENT_CACHE_VERSION) return null;
    if (cached.jobId !== jobId) return null;
    if (cached.applicantCount !== currentApplicantCount) return null;
    if (jobUpdatedAt && cached.jobUpdatedAt !== jobUpdatedAt) return null;

    return cached;
  } catch {
    return null;
  }
}

export function setBestMatchCache(
  jobId: number,
  applicantCount: number,
  jobUpdatedAt: string,
  candidates: CandidateMatch[],
  model: string = "gemini-2.5-pro"
): void {
  if (typeof window === "undefined" || !jobId) return;

  try {
    const cacheData: CachedBestMatch = {
      jobId,
      applicantCount,
      jobUpdatedAt: jobUpdatedAt || new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      model,
      version: CURRENT_CACHE_VERSION,
      candidates,
    };

    sessionStorage.setItem(`${CACHE_PREFIX}${jobId}`, JSON.stringify(cacheData));
  } catch {
    // Ignore quota errors
  }
}

export function clearBestMatchCache(jobId: number): void {
  if (typeof window === "undefined" || !jobId) return;
  try {
    sessionStorage.removeItem(`${CACHE_PREFIX}${jobId}`);
  } catch {
    // Ignore error
  }
}
