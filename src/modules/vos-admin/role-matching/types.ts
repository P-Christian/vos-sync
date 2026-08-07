// src/modules/vos-admin/role-matching/types.ts

export type ExperienceLevel = "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE";

export interface JobCategory {
  category_id: number;
  category_code: string;
  category_name: string;
  description: string | null;
  is_active: boolean;
  role_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StandardRole {
  role_id: number;
  category_id: number;
  category_code?: string;
  category_name?: string;
  role_name: string;
  experience_level: ExperienceLevel;
  is_active: boolean;
  alias_count?: number;
  skill_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type AliasType = "EXACT" | "SYNONYM" | "KEYWORD" | "ABBREVIATION";

export interface SearchKeyword {
  alias_id: number;
  role_id: number;
  role_name?: string;
  category_name?: string;
  alias_name: string;
  normalized_alias: string;
  match_weight: number;
  is_primary: boolean;
  alias_type?: AliasType;
  created_at?: string;
  updated_at?: string;
}

export interface MasterSkill {
  id: number;
  skill_name: string;
  category?: string | null;
}

export interface RoleSkillMapping {
  id: number;
  role_id: number;
  role_name?: string;
  skill_id: number;
  skill_name?: string;
  importance_weight: number;
  is_required: boolean;
  created_at?: string;
}

export interface DashboardMetrics {
  totalCategories: number;
  totalStandardRoles: number;
  totalSearchKeywords: number;
  totalRoleSkills: number;
  lastUpdated: string;
}

export interface SimulationResult {
  keyword: string;
  resolvedContext: {
    resolved_role: string | null;
    resolved_role_id: number | null;
    category_code: string | null;
    category_name: string | null;
    matched_alias: string | null;
    match_weight: number;
  };
  overallScore: number;
  rankingScore: number;
  confidence: {
    score: number;
    level: string;
  };
  sections: Array<{ label: string; score: number; max: number }>;
  strengths: string[];
  evidence: Array<{ label: string; value: string }>;
  trace: Array<{ factor: string; result: string; points: number }>;
}
