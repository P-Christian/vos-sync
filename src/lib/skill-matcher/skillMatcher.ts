// src/lib/skill-matcher/skillMatcher.ts

import {
  MatcherOptions,
  SingleSkillMatchResult,
  SkillIntelligenceDictionary,
  SkillMatcherOutput,
} from "./types";
import {
  DEFAULT_SKILL_DICTIONARY,
  getCanonicalSkillName,
  normalizeSkillName,
} from "./dictionary";

/**
 * Calculates a rule-based match score and detailed breakdown between
 * a set of required job skills and candidate skills.
 */
export function calculateGlobalSkillMatch(
  requiredSkillsInput: (string | { skill_name: string })[],
  candidateSkillsInput: (string | { skill_name?: string; name?: string })[],
  options?: MatcherOptions,
  customDict?: Partial<SkillIntelligenceDictionary>
): SkillMatcherOutput {
  const dict: SkillIntelligenceDictionary = {
    aliases: { ...DEFAULT_SKILL_DICTIONARY.aliases, ...(customDict?.aliases || {}) },
    categories: { ...DEFAULT_SKILL_DICTIONARY.categories, ...(customDict?.categories || {}) },
    relations: { ...DEFAULT_SKILL_DICTIONARY.relations, ...(customDict?.relations || {}) },
    hierarchy: { ...DEFAULT_SKILL_DICTIONARY.hierarchy, ...(customDict?.hierarchy || {}) },
  };

  const categoryScoreDefault = options?.categoryMatchScore ?? 0.65;
  const hierarchyScoreDefault = options?.hierarchyMatchScore ?? 0.85;

  // Extract raw text strings
  const rawRequiredList = requiredSkillsInput.map((s) =>
    typeof s === "string" ? s : s.skill_name || ""
  ).filter((s) => s.trim().length > 0);

  const rawCandidateList = candidateSkillsInput.map((s) => {
    if (typeof s === "string") return s;
    return s.skill_name || s.name || "";
  }).filter((s) => s.trim().length > 0);

  if (rawRequiredList.length === 0) {
    return {
      skillScore: 100,
      matchingSkills: rawCandidateList,
      missingSkills: [],
      matchDetails: [],
    };
  }

  const matchDetails: SingleSkillMatchResult[] = [];
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  let accumulatedScore = 0;

  for (const reqRaw of rawRequiredList) {
    const reqNorm = normalizeSkillName(reqRaw);
    const reqCanon = getCanonicalSkillName(reqNorm, dict);
    const reqCategory = dict.categories[reqCanon] || dict.categories[reqNorm];

    let bestCandidateSkill: string | null = null;
    let bestScore = 0;
    let bestTier: SingleSkillMatchResult["matchTier"] = "NONE";
    let bestReason = "No matching skill found in applicant profile";

    for (const candRaw of rawCandidateList) {
      const candNorm = normalizeSkillName(candRaw);
      const candCanon = getCanonicalSkillName(candNorm, dict);
      const candCategory = dict.categories[candCanon] || dict.categories[candNorm];

      // 1. EXACT MATCH
      if (reqNorm === candNorm) {
        if (1.0 > bestScore) {
          bestScore = 1.0;
          bestCandidateSkill = candRaw;
          bestTier = "EXACT";
          bestReason = `Exact match ("${candRaw}")`;
        }
        break; // Max score achieved
      }

      // 2. ALIAS MATCH
      if (reqCanon === candCanon) {
        if (1.0 > bestScore) {
          bestScore = 1.0;
          bestCandidateSkill = candRaw;
          bestTier = "ALIAS";
          bestReason = `Matched via alias ("${candRaw}" → "${reqCanon}")`;
        }
        continue;
      }

      // 3. EXPLICIT RELATION MATCH
      const pairKey1 = `${reqCanon}:${candCanon}`;
      const pairKey2 = `${candCanon}:${reqCanon}`;
      const relScore = dict.relations[pairKey1] ?? dict.relations[pairKey2];

      if (relScore != null && relScore > bestScore) {
        bestScore = relScore;
        bestCandidateSkill = candRaw;
        bestTier = "RELATION";
        bestReason = `Related technology ("${candRaw}" ~ ${Math.round(relScore * 100)}% match to "${reqRaw}")`;
        continue;
      }

      // 4. HIERARCHY MATCH (Parent / Child)
      const isParent = dict.hierarchy[candCanon] === reqCanon;
      const isChild = dict.hierarchy[reqCanon] === candCanon;

      if ((isParent || isChild) && hierarchyScoreDefault > bestScore) {
        bestScore = hierarchyScoreDefault;
        bestCandidateSkill = candRaw;
        bestTier = "HIERARCHY";
        bestReason = `Hierarchy match (${isParent ? "Child domain" : "Parent domain"} "${candRaw}" for "${reqRaw}")`;
        continue;
      }

      // 5. SAME DOMAIN CATEGORY
      if (reqCategory && candCategory && reqCategory === candCategory && categoryScoreDefault > bestScore) {
        bestScore = categoryScoreDefault;
        bestCandidateSkill = candRaw;
        bestTier = "CATEGORY";
        bestReason = `Same domain category ("${candCategory}")`;
        continue;
      }
    }

    accumulatedScore += bestScore;

    matchDetails.push({
      requiredSkill: reqRaw,
      matchedCandidateSkill: bestCandidateSkill,
      score: bestScore,
      matchTier: bestTier,
      reason: bestReason,
    });

    if (bestScore >= (options?.minThreshold ?? 0.5)) {
      matchingSkills.push(reqRaw);
    } else {
      missingSkills.push(reqRaw);
    }
  }

  const skillScore = Math.round((accumulatedScore / rawRequiredList.length) * 100);

  return {
    skillScore,
    matchingSkills,
    missingSkills,
    matchDetails,
  };
}
