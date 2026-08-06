// src/modules/client/applicants/services/bestMatchAIService.ts

import { JobPosting } from "../../jobs/types";
import { Applicant } from "../types";
import { calculateMatch, MatchResult } from "../utils/matchEngine";
import { CandidateMatch } from "../hooks/useBestMatchCache";

export interface BestMatchProcessResult {
  candidateMatches: CandidateMatch[];
  ruleMatches: Map<number, MatchResult>;
}

export async function processBestMatchAI(
  job: JobPosting,
  applicants: Applicant[],
  onProgress?: (step: string) => void
): Promise<BestMatchProcessResult> {
  const ruleMatchesMap = new Map<number, MatchResult>();

  if (!job || applicants.length === 0) {
    return { candidateMatches: [], ruleMatches: ruleMatchesMap };
  }

  // 1. Finding candidates
  onProgress?.("Finding Candidates...");
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 2. Ranking candidates via deterministic Rule Engine
  onProgress?.("Ranking Skills...");
  const evaluated = applicants.map((applicant) => {
    const match = calculateMatch(job, applicant);
    ruleMatchesMap.set(applicant.application_id, match);
    return {
      applicant,
      match,
    };
  });

  // Sort candidates by overall score descending
  evaluated.sort((a, b) => b.match.overallScore - a.match.overallScore);

  // Take top 20 candidates only to optimize latency, cost, and token usage
  const topCandidates = evaluated.slice(0, 20);

  // 3. Analyzing with Gemini via Server API Route
  onProgress?.("Analyzing with Gemini...");

  const candidatePayload = topCandidates.map(({ applicant, match }) => ({
    applicationId: applicant.application_id,
    name: applicant.applicant_name,
    experienceYears: applicant.experience_years ?? 0,
    ruleScore: match.overallScore,
    matchingSkills: match.matchingSkills.slice(0, 6),
    missingSkills: match.missingSkills.slice(0, 4),
  }));

  const prompt = `You are an expert recruitment AI assistant. Analyze the top candidates below for a job posting and provide concise recruiter evaluations.

Job Title: "${job.job_title}"
Experience Level Required: "${job.experience_level || "ENTRY"}"
Required Skills: "${(job.skills || []).join(", ") || "General Skills"}"

Candidates (Ranked by Rule Engine):
${JSON.stringify(candidatePayload, null, 2)}

Provide JSON response ONLY (no markdown fences, no extra text):
[
  {
    "applicationId": <number>,
    "explanation": "<1-2 concise factual sentences on hiring suitability>",
    "strengths": ["<key strength 1>", "<key strength 2>"],
    "weaknesses": ["<key missing skill or gap if any>"]
  }
]`;

  let aiResponsesMap = new Map<number, { explanation: string; strengths: string[]; weaknesses: string[] }>();

  try {
    const res = await fetch("/api/client/applicants/best-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawGemini = data?.result;

      if (rawGemini && typeof rawGemini === "string") {
        const cleaned = rawGemini
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item.applicationId === "number") {
              aiResponsesMap.set(item.applicationId, {
                explanation: item.explanation || "Strong match based on overall experience and skills.",
                strengths: Array.isArray(item.strengths) ? item.strengths : [],
                weaknesses: Array.isArray(item.weaknesses) ? item.weaknesses : [],
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[BestMatchAI] API request skipped or failed, using rule engine summaries:", err);
  }

  // Combine deterministic scores with Gemini insights (or rule fallbacks)
  const candidateMatches: CandidateMatch[] = topCandidates.map(({ applicant, match }) => {
    const aiData = aiResponsesMap.get(applicant.application_id);

    const fallbackExplanation = match.badge.description || `Scored ${match.overallScore}% fit matching required qualifications.`;
    const fallbackStrengths = match.matchingSkills.length > 0 
      ? match.matchingSkills.slice(0, 3).map((s) => `Strong proficiency in ${s}`)
      : [`${applicant.experience_years ?? 0} years relevant experience`];
    const fallbackWeaknesses = match.missingSkills.length > 0
      ? match.missingSkills.slice(0, 2).map((s) => `Missing ${s}`)
      : [];

    return {
      applicationId: applicant.application_id,
      ruleScore: match.overallScore,
      aiScore: match.overallScore,
      finalScore: match.overallScore,
      explanation: aiData?.explanation || fallbackExplanation,
      strengths: aiData?.strengths && aiData.strengths.length > 0 ? aiData.strengths : fallbackStrengths,
      weaknesses: aiData?.weaknesses ? aiData.weaknesses : fallbackWeaknesses,
    };
  });

  return {
    candidateMatches,
    ruleMatches: ruleMatchesMap,
  };
}
