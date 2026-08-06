// src/modules/matching-engine/retrieval/taxonomyResolver.ts

import { AnalyzedQuery } from "./queryAnalyzer";
import { ResolvedTaxonomyContext } from "../types/matchTypes";
import { cleanText } from "../normalizers/textNormalizer";
import { computeJaccardSimilarity } from "../normalizers/tokenExtractor";

export interface DBTaxonomyData {
  aliasList?: any[];
  rolesList?: any[];
  catList?: any[];
  masterSkills?: any[];
}

export function resolveTaxonomyFromDB(
  analyzedQuery: AnalyzedQuery,
  dbData: DBTaxonomyData = {}
): ResolvedTaxonomyContext {
  const { cleanedQuery, rawQuery } = analyzedQuery;
  const aliasList = dbData.aliasList ?? [];
  const rolesList = dbData.rolesList ?? [];
  const catList = dbData.catList ?? [];

  const rolesMap = new Map<number, any>(rolesList.map((r: any) => [Number(r.role_id), r]));
  const catMap = new Map<number, any>(catList.map((c: any) => [Number(c.category_id), c]));

  // 1. Database Alias Lookup (Exact -> Substring -> Token Similarity)
  let matchedAliasObj = aliasList.find((a: any) => cleanText(a.normalized_alias || a.alias_name) === cleanedQuery);

  if (!matchedAliasObj) {
    matchedAliasObj = aliasList.find((a: any) => {
      const normAlias = cleanText(a.normalized_alias || a.alias_name);
      return normAlias && (cleanedQuery.includes(normAlias) || normAlias.includes(cleanedQuery));
    });
  }

  if (!matchedAliasObj) {
    let bestSim = 0;
    for (const a of aliasList) {
      const normAlias = cleanText(a.normalized_alias || a.alias_name);
      if (!normAlias) continue;
      const sim = computeJaccardSimilarity(cleanedQuery, normAlias);
      if (sim > bestSim && sim >= 0.6) {
        bestSim = sim;
        matchedAliasObj = a;
      }
    }
  }

  let rId = matchedAliasObj
    ? typeof matchedAliasObj.role_id === "object"
      ? matchedAliasObj.role_id?.role_id
      : Number(matchedAliasObj.role_id)
    : null;

  let roleObj = rId ? rolesMap.get(rId) : null;

  // 2. Direct Role Title Lookup in vs_role_title if alias table lookup was not resolved
  if (!roleObj && rolesList.length > 0) {
    roleObj = rolesList.find((r: any) => {
      const rClean = cleanText(r.role_name);
      return (
        rClean === cleanedQuery ||
        (cleanedQuery.length > 2 && rClean.includes(cleanedQuery)) ||
        (rClean.length > 2 && cleanedQuery.includes(rClean)) ||
        computeJaccardSimilarity(rClean, cleanedQuery) >= 0.6
      );
    });

    if (roleObj) {
      rId = Number(roleObj.role_id);
    }
  }

  // 3. Category Lookup
  const cId = roleObj
    ? typeof roleObj.category_id === "object"
      ? roleObj.category_id?.category_id
      : Number(roleObj.category_id)
    : null;
  let catObj = cId ? catMap.get(cId) : null;

  if (!catObj && catList.length > 0) {
    catObj = catList[0];
  }

  const resolvedRoleName = roleObj?.role_name ?? "Full Stack Developer";

  // Build expanded aliases dynamically from matching DB role aliases
  const dbRoleAliases = aliasList
    .filter((a: any) => {
      const aliasRoleId = typeof a.role_id === "object" ? a.role_id?.role_id : Number(a.role_id);
      return aliasRoleId === rId;
    })
    .map((a: any) => cleanText(a.normalized_alias || a.alias_name));

  const expandedSet = new Set<string>([
    cleanedQuery,
    cleanText(resolvedRoleName),
    ...dbRoleAliases,
  ]);

  return {
    keyword: rawQuery,
    resolved_role: resolvedRoleName,
    resolved_role_id: rId || 1,
    category_code: catObj?.category_code ?? "ENG_SOFTWARE",
    category_name: catObj?.category_name ?? "Software Engineering",
    matched_alias: matchedAliasObj?.alias_name ?? rawQuery,
    match_weight: Number(matchedAliasObj?.match_weight ?? 1.0),
    alias_type: matchedAliasObj?.alias_type ?? (matchedAliasObj?.is_primary ? "EXACT" : "SYNONYM"),
    expanded_aliases: Array.from(expandedSet).filter(Boolean),
  };
}
