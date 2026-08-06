// src/app/api/vos-admin/job-roles/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function GET() {
  try {
    const [catRes, rolesRes, aliasesRes, skillsRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_role_category?aggregate[count]=category_id`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_title?aggregate[count]=role_id`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_title_alias?aggregate[count]=alias_id`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping?aggregate[count]=id`, { headers: getHeaders(), cache: "no-store" }),
    ]);

    const catJson = catRes.ok ? await catRes.json() : {};
    const rolesJson = rolesRes.ok ? await rolesRes.json() : {};
    const aliasesJson = aliasesRes.ok ? await aliasesRes.json() : {};
    const skillsJson = skillsRes.ok ? await skillsRes.json() : {};

    const totalCategories = Number(catJson.data?.[0]?.count?.category_id ?? 0);
    const totalStandardRoles = Number(rolesJson.data?.[0]?.count?.role_id ?? 0);
    const totalSearchKeywords = Number(aliasesJson.data?.[0]?.count?.alias_id ?? 0);
    const totalRoleSkills = Number(skillsJson.data?.[0]?.count?.id ?? 0);

    return NextResponse.json({
      totalCategories,
      totalStandardRoles,
      totalSearchKeywords,
      totalRoleSkills,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch dashboard metrics." }, { status: 500 });
  }
}
