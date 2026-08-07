// src/app/api/vos-admin/job-roles/skills/route.ts

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isMaster = searchParams.get("master") === "true";

    if (isMaster) {
      const res = await fetch(`${DIRECTUS_BASE}/items/vs_master_skills?limit=-1`, {
        headers: getHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch master skills.");
      const json = await res.json();
      return NextResponse.json({ master_skills: json.data ?? [] });
    }

    const roleId = searchParams.get("role_id");
    const filterParam = roleId ? `&filter[role_id][_eq]=${roleId}` : "";

    // Fetch mappings, roles, and master skills in parallel for robust in-memory join
    const [mappingsRes, rolesRes, masterSkillsRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping?limit=-1${filterParam}`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_title?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_master_skills?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
    ]);

    const mappingsJson = mappingsRes.ok ? await mappingsRes.json() : {};
    const rolesJson = rolesRes.ok ? await rolesRes.json() : {};
    const masterJson = masterSkillsRes.ok ? await masterSkillsRes.json() : {};

    let rawMappings = mappingsJson.data ?? [];
    const rolesList = rolesJson.data ?? [];
    const masterList = masterJson.data ?? [];

    const rolesMap = new Map(rolesList.map((r: { role_id: number; role_name: string }) => [Number(r.role_id), r.role_name]));
    const skillsMap = new Map(masterList.map((s: { id: number; skill_name: string }) => [Number(s.id), s.skill_name]));

    // If DB has no mappings yet and no role filter was requested, auto-seed standard defaults
    if (rawMappings.length === 0 && !roleId) {
      const defaultMappings = [
        { role_id: 3, skill_id: 1, importance_weight: 1.0, is_required: 1 },
        { role_id: 3, skill_id: 2, importance_weight: 0.95, is_required: 1 },
        { role_id: 3, skill_id: 3, importance_weight: 0.95, is_required: 1 },
        { role_id: 3, skill_id: 4, importance_weight: 0.85, is_required: 0 },
        { role_id: 6, skill_id: 1, importance_weight: 1.0, is_required: 1 },
        { role_id: 6, skill_id: 5, importance_weight: 0.95, is_required: 1 },
        { role_id: 5, skill_id: 5, importance_weight: 1.0, is_required: 1 },
        { role_id: 5, skill_id: 7, importance_weight: 0.9, is_required: 1 },
        { role_id: 5, skill_id: 8, importance_weight: 0.95, is_required: 1 },
      ];

      for (const item of defaultMappings) {
        await fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(item),
        }).catch(() => null);
      }

      const refetch = await fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping?limit=-1`, { headers: getHeaders(), cache: "no-store" });
      if (refetch.ok) rawMappings = (await refetch.json()).data ?? [];
    }

    const formatted = rawMappings.map((m: { id: number; role_id: unknown; skill_id: unknown; importance_weight?: number; is_required?: boolean }) => {
      const rId = typeof m.role_id === "object" && m.role_id !== null ? (m.role_id as { role_id: number }).role_id : Number(m.role_id);
      const sId = typeof m.skill_id === "object" && m.skill_id !== null ? (m.skill_id as { id: number }).id : Number(m.skill_id);
      const rName = typeof m.role_id === "object" && m.role_id !== null ? (m.role_id as { role_name: string }).role_name : rolesMap.get(rId);
      const sName = typeof m.skill_id === "object" && m.skill_id !== null ? (m.skill_id as { skill_name: string }).skill_name : skillsMap.get(sId);

      return {
        id: m.id,
        role_id: rId,
        role_name: rName || `Role #${rId}`,
        skill_id: sId,
        skill_name: sName || `Skill #${sId}`,
        importance_weight: Number(m.importance_weight ?? 1.0),
        is_required: Boolean(m.is_required),
      };
    });

    return NextResponse.json({ skills: formatted });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create role skill mapping.");
    const json = await res.json();
    return NextResponse.json(json.data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Mapping ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update role skill mapping.");
    const json = await res.json();
    return NextResponse.json(json.data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Mapping ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete role skill mapping.");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}
