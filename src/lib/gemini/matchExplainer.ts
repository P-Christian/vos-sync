// src/lib/gemini/matchExplainer.ts

import { callGeminiSafe } from "./geminiClient";

export interface ExplainCandidate {
  name: string;
  title: string | null;
  skills: string[];
  summary: string | null;
  experience_years: number;
}

/**
 * Generate a 1-2 sentence human-readable explanation of why this candidate
 * matches the employer's search query.
 * Returns null on any failure — UI should handle gracefully.
 */
export async function generateMatchExplanation(
  query: string,
  candidate: ExplainCandidate
): Promise<string | null> {
  if (!query || !candidate) return null;

  const prompt = `You are a recruitment assistant.

Employer search: "${query}"

Candidate profile:
- Name: ${candidate.name}
- Current title: ${candidate.title ?? "Not specified"}
- Skills: ${candidate.skills.slice(0, 8).join(", ")}
- Experience: ${candidate.experience_years} years
- Summary: ${(candidate.summary ?? "").slice(0, 200)}

Write 1-2 concise sentences explaining why this candidate is a strong match for the employer's search. 
Be specific, professional, and factual. Do not use filler phrases like "This candidate is a great fit".
Start directly with what makes them relevant.`;

  const result = await callGeminiSafe(prompt);
  if (!result || result.length < 10) return null;

  // Return first 2 sentences max
  const sentences = result.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, 2).join(" ").trim() || result.slice(0, 200);
}

/**
 * Batch generate explanations for multiple candidates.
 * Runs sequentially (not parallel) to avoid rate limits.
 */
export async function generateBatchExplanations(
  query: string,
  candidates: (ExplainCandidate & { id: number })[]
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  for (const candidate of candidates) {
    const explanation = await generateMatchExplanation(query, candidate);
    if (explanation) results.set(candidate.id, explanation);
  }
  return results;
}
