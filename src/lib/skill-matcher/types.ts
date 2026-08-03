// src/lib/skill-matcher/types.ts

export type MatchTier = 'EXACT' | 'ALIAS' | 'RELATION' | 'HIERARCHY' | 'CATEGORY' | 'NONE';

export interface SingleSkillMatchResult {
  requiredSkill: string;
  matchedCandidateSkill: string | null;
  score: number; // 0.0 to 1.0
  matchTier: MatchTier;
  reason: string;
}

export interface SkillMatcherOutput {
  skillScore: number; // 0 to 100
  matchingSkills: string[];
  missingSkills: string[];
  matchDetails: SingleSkillMatchResult[];
}

export interface SkillAliasMap {
  [alias: string]: string; // e.g. "react.js" -> "react"
}

export interface SkillCategoryMap {
  [skill: string]: string; // e.g. "yolo" -> "computer vision"
}

export interface SkillRelationMap {
  [skillPair: string]: number; // e.g. "yolo:opencv" -> 0.85
}

export interface SkillHierarchyMap {
  [childSkill: string]: string; // e.g. "opencv" -> "computer vision"
}

export interface SkillIntelligenceDictionary {
  aliases: SkillAliasMap;
  categories: SkillCategoryMap;
  relations: SkillRelationMap;
  hierarchy: SkillHierarchyMap;
}

export interface MatcherOptions {
  categoryMatchScore?: number; // Default 0.65
  hierarchyMatchScore?: number; // Default 0.85
  minThreshold?: number; // Default 0.50 for passing match
}
