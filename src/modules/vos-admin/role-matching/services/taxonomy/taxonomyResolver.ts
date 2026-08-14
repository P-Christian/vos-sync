// src/modules/vos-admin/role-matching/services/taxonomy/taxonomyResolver.ts
// Directus read-only resolver for existing categories, roles, aliases, and master skills.

import { normalizeKeyword } from "../../validators";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export interface ExistingCategory {
  category_id: number;
  category_name: string;
  category_code: string;
}

export interface ExistingRole {
  role_id: number;
  role_name: string;
  category_id: number;
}

export interface ExistingAlias {
  alias_id: number;
  alias_name: string;
  normalized_alias: string;
  role_id: number;
}

export interface ExistingMasterSkill {
  id: number;
  skill_name: string;
}

export interface ExistingRoleSkill {
  id: number;
  role_id: number;
  skill_id: number;
}

export async function fetchExistingTaxonomyState() {
  try {
    const [catRes, roleRes, aliasRes, skillRes, mappingRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_role_category?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_title?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_title_alias?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_master_skills?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
    ]);

    const categories: ExistingCategory[] = catRes.ok ? ((await catRes.json()).data ?? []) : [];
    const roles: ExistingRole[] = roleRes.ok ? ((await roleRes.json()).data ?? []) : [];
    const aliases: ExistingAlias[] = aliasRes.ok ? ((await aliasRes.json()).data ?? []) : [];
    const masterSkills: ExistingMasterSkill[] = skillRes.ok ? ((await skillRes.json()).data ?? []) : [];
    const roleSkills: ExistingRoleSkill[] = mappingRes.ok ? ((await mappingRes.json()).data ?? []) : [];

    return { categories, roles, aliases, masterSkills, roleSkills };
  } catch (err) {
    console.warn("[taxonomyResolver] ⚠️ Failed to fetch complete taxonomy state:", err);
    return { categories: [], roles: [], aliases: [], masterSkills: [], roleSkills: [] };
  }
}

export function findMatchingCategory(categories: ExistingCategory[], name: string): ExistingCategory | null {
  const norm = normalizeKeyword(name);
  return categories.find((c) => normalizeKeyword(c.category_name) === norm || c.category_code === norm) ?? null;
}

export function findMatchingRole(roles: ExistingRole[], name: string): ExistingRole | null {
  const norm = normalizeKeyword(name);
  return roles.find((r) => normalizeKeyword(r.role_name) === norm) ?? null;
}

export function findMatchingAlias(aliases: ExistingAlias[], name: string): ExistingAlias | null {
  const norm = normalizeKeyword(name);
  return aliases.find((a) => a.normalized_alias === norm || normalizeKeyword(a.alias_name) === norm) ?? null;
}

export function findMatchingSkill(skills: ExistingMasterSkill[], name: string): ExistingMasterSkill | null {
  const norm = normalizeKeyword(name);
  return skills.find((s) => normalizeKeyword(s.skill_name) === norm) ?? null;
}
