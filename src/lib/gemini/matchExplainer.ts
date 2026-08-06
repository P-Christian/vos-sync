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
 * Batch generate explanations for up to 10 candidates in a SINGLE Gemini call.
 * Falls back gracefully — any unparseable entry is simply omitted from the map.
 */
export async function generateBatchExplanations(
  query: string,
  candidates: (ExplainCandidate & { id: number })[]
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  if (!query || candidates.length === 0) return results;

  const candidateBlock = candidates
    .map(
      (c) =>
        `[ID:${c.id}]
Name: ${c.name}
Title: ${c.title ?? "Not specified"}
Skills: ${c.skills.slice(0, 8).join(", ") || "None listed"}
Experience: ${c.experience_years} year${c.experience_years !== 1 ? "s" : ""}
Summary: ${(c.summary ?? "").slice(0, 150)}`
    )
    .join("\n\n");

  const prompt = `You are a recruitment assistant. For each candidate below, write 1-2 concise sentences explaining why they match the employer's search. Be specific and factual. Do not use filler phrases like "great fit" or "ideal candidate". Start directly with what makes them relevant.

Employer search: "${query}"

${candidateBlock}

Respond with ONLY a JSON array. No markdown, no explanation, no extra text:
[{"id": <number>, "explanation": "<1-2 sentences>"}]`;

  const raw = await callGeminiSafe(prompt );
  if (!raw) return results;

  // Strip markdown fences if Gemini wraps the response anyway
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: { id: number; explanation: string }[];
  try {
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return results;
  } catch {
    // Attempt to salvage partial JSON — extract any valid objects
    const matches = [...cleaned.matchAll(/\{\s*"id"\s*:\s*(\d+)\s*,\s*"explanation"\s*:\s*"([^"]+)"\s*\}/g)];
    parsed = matches.map((m) => ({ id: Number(m[1]), explanation: m[2] }));
    if (parsed.length === 0) return results;
  }

  const validIds = new Set(candidates.map((c) => c.id));
  for (const entry of parsed) {
    if (
      typeof entry.id === "number" &&
      typeof entry.explanation === "string" &&
      entry.explanation.length >= 10 &&
      validIds.has(entry.id)
    ) {
      // Trim to 2 sentences max as a safety net
      const sentences = entry.explanation.match(/[^.!?]+[.!?]+/g) ?? [];
      const trimmed = sentences.slice(0, 2).join(" ").trim() || entry.explanation.slice(0, 200);
      results.set(entry.id, trimmed);
    }
  }

  return results;
}