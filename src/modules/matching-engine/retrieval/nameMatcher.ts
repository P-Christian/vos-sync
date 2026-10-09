// src/modules/matching-engine/retrieval/nameMatcher.ts

import { cleanText } from "../normalizers/textNormalizer";
import { computeTokenOverlapScore } from "./tokenMatcher";
import { computeJaroWinkler } from "./fuzzyMatcher";

export interface NameMatchResult {
  matched: boolean;
  score: number;
  reason: string;
}

export function matchCandidateName(query: string, candidateName: string): NameMatchResult {
  const queryClean = cleanText(query);
  const nameClean = cleanText(candidateName);
  if (!queryClean || !nameClean) {
    return { matched: false, score: 0, reason: "" };
  }

  // 1. Exact match
  if (queryClean === nameClean) {
    return { matched: true, score: 100, reason: "NAME_EXACT_MATCH" };
  }

  // 2. Space-stripped match (e.g. "delacruz" vs "dela cruz")
  const queryNoSpaces = queryClean.replace(/\s+/g, "");
  const nameNoSpaces = nameClean.replace(/\s+/g, "");
  if (queryNoSpaces && nameNoSpaces && queryNoSpaces === nameNoSpaces) {
    return { matched: true, score: 98, reason: "NAME_EXACT_MATCH" };
  }

  // 3. Token overlap match (e.g. searching "Juan" or "Dela Cruz" matches "Juan Dela Cruz")
  const tokenOverlap = computeTokenOverlapScore(queryClean, nameClean);
  if (tokenOverlap === 1.0) {
    return { matched: true, score: 95, reason: "NAME_TOKEN_MATCH" };
  }
  if (tokenOverlap >= 0.5) {
    return { matched: true, score: Math.round(tokenOverlap * 90), reason: "NAME_TOKEN_MATCH" };
  }

  // 4. Substring containment (query of 3+ chars contained in name or vice versa)
  if (queryClean.length >= 3 && nameClean.includes(queryClean)) {
    return { matched: true, score: 90, reason: "NAME_SUBSTRING_MATCH" };
  }
  if (nameClean.length >= 3 && queryClean.includes(nameClean)) {
    return { matched: true, score: 90, reason: "NAME_SUBSTRING_MATCH" };
  }

  // 5. Fuzzy character match (typo handling across entire name)
  if (queryClean.length >= 3) {
    const jaro = computeJaroWinkler(queryClean, nameClean);
    if (jaro >= 0.85) {
      return { matched: true, score: Math.round(jaro * 90), reason: "NAME_FUZZY_MATCH" };
    }
  }

  return { matched: false, score: 0, reason: "" };
}
