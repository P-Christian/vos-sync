// src/modules/matching-engine/retrieval/candidateRetriever.ts

import { NormalizedProfile } from "../types/profileTypes";
import { AnalyzedQuery } from "./queryAnalyzer";
import { ResolvedTaxonomyContext } from "../types/matchTypes";
import { cleanText } from "../normalizers/textNormalizer";
import { computeJaroWinkler } from "./fuzzyMatcher";
import { computeTokenOverlapScore } from "./tokenMatcher";

export interface CandidateRetrievalResult {
  candidate: NormalizedProfile;
  retrievalScore: number; // 0 - 100 internal score
  retrievalReason: string;
}

export function retrieveCandidatePool(
  profiles: NormalizedProfile[],
  analyzedQuery: AnalyzedQuery,
  taxonomyContext?: ResolvedTaxonomyContext | null,
  minRetrievalThreshold: number = 20
): CandidateRetrievalResult[] {
  const { cleanedQuery } = analyzedQuery;

  // If no query string, retrieve all candidates (Browse mode)
  if (!cleanedQuery) {
    return profiles.map((p) => ({
      candidate: p,
      retrievalScore: 100,
      retrievalReason: "BROWSE_ALL",
    }));
  }

  const expandedAliases = (taxonomyContext?.expanded_aliases ?? []).map(cleanText);
  if (taxonomyContext?.resolved_role) expandedAliases.push(cleanText(taxonomyContext.resolved_role));
  expandedAliases.push(cleanedQuery);

  const results: CandidateRetrievalResult[] = [];

  for (const candidate of profiles) {
    let bestScore = 0;
    let primaryReason = "NO_MATCH";

    const candidateTitlesClean = candidate.titles.map(cleanText);
    const candidateSkillsClean = candidate.skills.map(cleanText);

    // 1. Character & Token Match against Candidate Titles
    for (const title of candidateTitlesClean) {
      if (!title) continue;

      // Exact substring or token match
      const tokenOverlap = computeTokenOverlapScore(cleanedQuery, title);
      if (tokenOverlap > 0) {
        const score = Math.round(tokenOverlap * 100);
        if (score > bestScore) {
          bestScore = score;
          primaryReason = `TITLE_TOKEN_MATCH (${title})`;
        }
      }

      // Typo handling via Jaro-Winkler character similarity
      const jaroSim = computeJaroWinkler(cleanedQuery, title);
      if (jaroSim >= 0.75) {
        const score = Math.round(jaroSim * 90);
        if (score > bestScore) {
          bestScore = score;
          primaryReason = `TYPO_FUZZY_MATCH (${title})`;
        }
      }
    }

    // 2. Match against DB Expanded Taxonomy Aliases
    for (const alias of expandedAliases) {
      if (!alias || alias.length < 3) continue;

      for (const title of candidateTitlesClean) {
        const aliasOverlap = computeTokenOverlapScore(alias, title);
        if (aliasOverlap >= 0.6) {
          const score = Math.round(aliasOverlap * 85);
          if (score > bestScore) {
            bestScore = score;
            primaryReason = `ALIAS_TAXONOMY_MATCH (${alias})`;
          }
        }
      }
    }

    // 3. Match against Candidate Skills
    for (const skill of candidateSkillsClean) {
      if (!skill) continue;
      if (cleanedQuery.includes(skill) || skill.includes(cleanedQuery)) {
        const score = 70;
        if (score > bestScore) {
          bestScore = score;
          primaryReason = `SKILL_MATCH (${skill})`;
        }
      }
    }

    // 4. Match against Profile Summary
    const summaryClean = cleanText(candidate.summary);
    if (summaryClean) {
      for (const alias of expandedAliases) {
        if (alias.length > 3 && summaryClean.includes(alias)) {
          const score = 50;
          if (score > bestScore) {
            bestScore = score;
            primaryReason = `SUMMARY_MATCH (${alias})`;
          }
        }
      }
    }

    // Retain candidates meeting threshold (default >= 20 pts for High Recall)
    if (bestScore >= minRetrievalThreshold) {
      results.push({
        candidate,
        retrievalScore: bestScore,
        retrievalReason: primaryReason,
      });
    }
  }

  // Sort candidate pool by Layer 1 retrieval score
  return results.sort((a, b) => b.retrievalScore - a.retrievalScore);
}
