// src/lib/gemini/aiReranker.ts

import { callGeminiSafe } from "./geminiClient";

export interface RerankCandidate {
  id: number;
  title: string | null;
  skills: string[];
  summary: string | null;
}

export interface RerankResult {
  ranked_ids: number[];
  used_ai: boolean;
}

/**
 * Use Gemini to semantically rerank top candidates.
 * Falls back to original order if Gemini fails or times out.
 * Only processes top 50 candidates to control API cost.
 */
export async function rerankCandidatesWithGemini(
  query: string,
  candidates: RerankCandidate[]
): Promise<RerankResult> {
  if (!query || candidates.length === 0) {
    return { ranked_ids: candidates.map((c) => c.id), used_ai: false };
  }

  const top = candidates.slice(0, 50);

  const candidateList = top
    .map(
      (c, i) =>
        `${i + 1}. ID:${c.id} | Title: ${c.title ?? "Unknown"} | Skills: ${c.skills.slice(0, 5).join(", ")} | Summary: ${(c.summary ?? "").slice(0, 120)}`
    )
    .join("\n");

  const prompt = `You are a recruitment AI assistant.

Employer is searching for: "${query}"

Rank the following candidates from MOST relevant to LEAST relevant based on the search query.
Return ONLY a JSON array of IDs in ranked order (most relevant first). No explanation.

Candidates:
${candidateList}

Return format example: [3, 7, 1, 5, 2, ...]
Return ONLY the JSON array, nothing else.`;

  const raw = await callGeminiSafe(prompt);
  if (!raw) {
    return { ranked_ids: top.map((c) => c.id), used_ai: false };
  }

  try {
    const arrMatch = raw.match(/\[[\s\S]*?\]/);
    if (!arrMatch) return { ranked_ids: top.map((c) => c.id), used_ai: false };

    const parsed = JSON.parse(arrMatch[0]);
    if (!Array.isArray(parsed)) {
      return { ranked_ids: top.map((c) => c.id), used_ai: false };
    }

    const validIds = new Set(top.map((c) => c.id));
    const ranked = (parsed as unknown[])
      .filter((x): x is number => typeof x === "number" && validIds.has(x));

    // Append any IDs Gemini skipped (preserve coverage)
    const covered = new Set(ranked);
    for (const c of top) {
      if (!covered.has(c.id)) ranked.push(c.id);
    }

    return { ranked_ids: ranked, used_ai: true };
  } catch {
    return { ranked_ids: top.map((c) => c.id), used_ai: false };
  }
}
