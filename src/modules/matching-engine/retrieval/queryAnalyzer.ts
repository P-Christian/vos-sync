// src/modules/matching-engine/retrieval/queryAnalyzer.ts

import { cleanText, splitTokens } from "../normalizers/textNormalizer";
import { extractStemmedTokens } from "../normalizers/tokenExtractor";

export interface AnalyzedQuery {
  rawQuery: string;
  cleanedQuery: string;
  tokens: string[];
  stemmedTokens: string[];
  requiredExperienceYears: number | null;
}

export function analyzeQuery(rawQuery: string): AnalyzedQuery {
  const original = (rawQuery || "").trim();
  const cleanedQuery = cleanText(original);

  let requiredExperienceYears: number | null = null;
  const expMatch = original.match(/(\d+)\s*(?:years?|yrs?)/i);
  if (expMatch) {
    requiredExperienceYears = parseInt(expMatch[1], 10);
  }

  const tokens = splitTokens(cleanedQuery);
  const stemmedTokens = extractStemmedTokens(cleanedQuery);

  return {
    rawQuery: original,
    cleanedQuery,
    tokens,
    stemmedTokens,
    requiredExperienceYears,
  };
}
