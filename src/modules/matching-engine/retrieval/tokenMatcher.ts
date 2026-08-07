// src/modules/matching-engine/retrieval/tokenMatcher.ts

import { extractStemmedTokens } from "../normalizers/tokenExtractor";
import { splitCompoundToken } from "../normalizers/tokenExtractor";
import { computeJaroWinkler } from "./fuzzyMatcher";

export function computeTokenOverlapScore(query: string, target: string): number {
  const rawQueryStems = extractStemmedTokens(query);
  const targetStems = extractStemmedTokens(target);
  if (rawQueryStems.length === 0 || targetStems.length === 0) return 0.0;

  const targetVocab = new Set(targetStems);

  // Expand compound query tokens (e.g. "webdeveloper" → ["web", "developer"])
  // using the candidate title's own vocabulary as a dictionary
  const queryStems: string[] = [];
  for (const qStem of rawQueryStems) {
    const parts = splitCompoundToken(qStem, targetVocab);
    if (parts.length > 1) {
      // Successfully split compound word — push expanded stems
      queryStems.push(...parts.map((p) => p.toLowerCase().trim()));
    } else {
      queryStems.push(qStem);
    }
  }

  const uniqueQueryStems = Array.from(new Set(queryStems));
  let matchCount = 0;

  for (const qStem of uniqueQueryStems) {
    if (targetVocab.has(qStem)) {
      matchCount++;
    } else {
      // Fuzzy character match for remaining typos on individual tokens
      const fuzzyMatch = targetStems.some((tStem) => computeJaroWinkler(qStem, tStem) >= 0.85);
      if (fuzzyMatch) matchCount++;
    }
  }

  return Number((matchCount / uniqueQueryStems.length).toFixed(2));
}
