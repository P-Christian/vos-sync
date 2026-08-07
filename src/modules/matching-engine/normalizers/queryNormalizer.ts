// src/modules/matching-engine/normalizers/queryNormalizer.ts

import { MatchMode, ResolvedTaxonomyContext } from "../types/matchTypes";
import { cleanText } from "./textNormalizer";
import { analyzeQuery } from "../retrieval/queryAnalyzer";
import { resolveTaxonomyFromDB, DBTaxonomyData } from "../retrieval/taxonomyResolver";

export interface NormalizedQueryResult {
  originalQuery: string;
  normalizedQuery: string;
  tokens: string[];
  stemmedTokens: string[];
  mode: MatchMode;
  resolvedRole: string | null;
  resolvedRoleId: number | null;
  categoryCode: string | null;
  categoryName: string | null;
  matchedAlias: string | null;
  matchWeight: number;
  aliasType: string;
  detectedSkills: string[];
  detectedExperienceYears: number | null;
  expandedAliases: string[];
}

export function cleanQueryString(query: string | null | undefined): string {
  return cleanText(query);
}

export function normalizeSearchQuery(
  rawQuery: string,
  existingTaxonomyContext?: ResolvedTaxonomyContext | null,
  dbData: DBTaxonomyData | Array<Record<string, unknown>> = {}
): NormalizedQueryResult {
  const analyzed = analyzeQuery(rawQuery);

  const dbTaxonomy: DBTaxonomyData = Array.isArray(dbData)
    ? { aliasList: dbData }
    : dbData;

  const taxonomyContext =
    existingTaxonomyContext ?? resolveTaxonomyFromDB(analyzed, dbTaxonomy);

  // Determine mode dynamically based on query analysis
  let mode = MatchMode.ROLE_SIMILARITY;
  if (analyzed.requiredExperienceYears !== null) {
    mode = MatchMode.HYBRID;
  }

  return {
    originalQuery: analyzed.rawQuery,
    normalizedQuery: analyzed.cleanedQuery,
    tokens: analyzed.tokens,
    stemmedTokens: analyzed.stemmedTokens,
    mode,
    resolvedRole: taxonomyContext.resolved_role,
    resolvedRoleId: taxonomyContext.resolved_role_id,
    categoryCode: taxonomyContext.category_code,
    categoryName: taxonomyContext.category_name,
    matchedAlias: taxonomyContext.matched_alias,
    matchWeight: taxonomyContext.match_weight,
    aliasType: taxonomyContext.alias_type ?? "SYNONYM",
    detectedSkills: [],
    detectedExperienceYears: analyzed.requiredExperienceYears,
    expandedAliases: taxonomyContext.expanded_aliases,
  };
}
