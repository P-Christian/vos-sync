// src/modules/matching-engine/retrieval/taxonomyResolver.ts

import { AnalyzedQuery } from "./queryAnalyzer";
import { ResolvedTaxonomyContext } from "../types/matchTypes";
import { cleanText } from "../normalizers/textNormalizer";
import { computeJaccardSimilarity } from "../normalizers/tokenExtractor";

export interface DBTaxonomyData {
  aliasList?: Array<Record<string, unknown>>;
  rolesList?: Array<Record<string, unknown>>;
  catList?: Array<Record<string, unknown>>;
  masterSkills?: Array<Record<string, unknown>>;
}

export function resolveTaxonomyFromDB(
  analyzedQuery: AnalyzedQuery,
  dbData: DBTaxonomyData = {}
): ResolvedTaxonomyContext {
  const { cleanedQuery, rawQuery } = analyzedQuery;
  const aliasList = dbData.aliasList ?? [];
  const rolesList = dbData.rolesList ?? [];
  const catList = dbData.catList ?? [];

  const rolesMap = new Map<number, Record<string, unknown>>(rolesList.map((r) => [Number(r.role_id), r]));
  const catMap = new Map<number, Record<string, unknown>>(catList.map((c) => [Number(c.category_id), c]));

  // 1. Database Alias Lookup (Exact -> Substring -> Token Similarity)
  let matchedAliasObj = aliasList.find((a) => cleanText(String(a.normalized_alias || a.alias_name)) === cleanedQuery);

  if (!matchedAliasObj) {
    matchedAliasObj = aliasList.find((a) => {
      const normAlias = cleanText(String(a.normalized_alias || a.alias_name));
      return normAlias && (cleanedQuery.includes(normAlias) || normAlias.includes(cleanedQuery));
    });
  }

  if (!matchedAliasObj) {
    let bestSim = 0;
    for (const a of aliasList) {
      const normAlias = cleanText(String(a.normalized_alias || a.alias_name));
      if (!normAlias) continue;
      const sim = computeJaccardSimilarity(cleanedQuery, normAlias);
      if (sim > bestSim && sim >= 0.4) {
        bestSim = sim;
        matchedAliasObj = a;
      }
    }
  }

  const matchedRoleId = matchedAliasObj
    ? typeof matchedAliasObj.role_id === "object" && matchedAliasObj.role_id !== null
      ? (matchedAliasObj.role_id as Record<string, unknown>).role_id
      : matchedAliasObj.role_id
    : null;

  const rId = matchedRoleId ? Number(matchedRoleId) : null;
  const roleObj = rId ? rolesMap.get(rId) : null;

  // 3. Category Lookup
  const cId = roleObj
    ? typeof roleObj.category_id === "object" && roleObj.category_id !== null
      ? (roleObj.category_id as Record<string, unknown>).category_id
      : roleObj.category_id
    : null;
  let catObj = cId ? catMap.get(Number(cId)) : null;

  if (!catObj && catList.length > 0) {
    catObj = catList[0];
  }

  const resolvedRoleName = String(roleObj?.role_name ?? "Full Stack Developer");

  // Build expanded aliases dynamically from matching DB role aliases
  const dbRoleAliases = aliasList
    .filter((a) => {
      const aliasRoleId = typeof a.role_id === "object" && a.role_id !== null ? (a.role_id as Record<string, unknown>).role_id : Number(a.role_id);
      return aliasRoleId === rId;
    })
    .map((a) => cleanText(String(a.normalized_alias || a.alias_name)));

  const expandedSet = new Set<string>([
    cleanedQuery,
    cleanText(resolvedRoleName),
    ...dbRoleAliases,
  ]);

  return {
    keyword: rawQuery,
    resolved_role: resolvedRoleName,
    resolved_role_id: rId || 1,
    category_code: String(catObj?.category_code ?? "ENG_SOFTWARE"),
    category_name: String(catObj?.category_name ?? "Software Engineering"),
    matched_alias: String(matchedAliasObj?.alias_name ?? rawQuery),
    match_weight: Number(matchedAliasObj?.match_weight ?? 1.0),
    alias_type: (matchedAliasObj?.alias_type as string) ?? ((matchedAliasObj?.is_primary as boolean) ? "EXACT" : "SYNONYM"),
    expanded_aliases: Array.from(expandedSet).filter(Boolean),
  };
}
