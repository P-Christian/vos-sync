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

    // 1. If requesting master skill creation or lookup
    if (body.create_master || body.master) {
      const skillName = (body.skill_name || "").trim();
      if (!skillName) {
        return NextResponse.json({ error: "Skill name is required." }, { status: 400 });
      }

      // Check if skill already exists in vs_master_skills
      const searchRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_master_skills?filter[skill_name][_icontains]=${encodeURIComponent(skillName)}`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const existing = (searchJson.data ?? []).find(
          (m: { skill_name: string }) => m.skill_name.trim().toLowerCase() === skillName.toLowerCase()
        );
        if (existing) {
          return NextResponse.json(existing);
        }
      }

      // Create new master skill
      const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_master_skills`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ skill_name: skillName, category: body.category || "General" }),
      });
      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        throw new Error(errJson.errors?.[0]?.message || "Failed to create master skill.");
      }
      const createdJson = await createRes.json();
      return NextResponse.json(createdJson.data);
    }

    // 2. Normal role skill mapping creation
    let targetSkillId = body.skill_id;

    // If skill_name was passed without skill_id, resolve or create master skill
    if (!targetSkillId && body.skill_name) {
      const sName = body.skill_name.trim();
      const searchRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_master_skills?filter[skill_name][_icontains]=${encodeURIComponent(sName)}`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const existing = (searchJson.data ?? []).find(
          (m: { skill_name: string }) => m.skill_name.trim().toLowerCase() === sName.toLowerCase()
        );
        if (existing) {
          targetSkillId = existing.id;
        }
      }

      if (!targetSkillId) {
        const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_master_skills`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ skill_name: sName }),
        });
        if (createRes.ok) {
          const createdJson = await createRes.json();
          targetSkillId = createdJson.data?.id;
        }
      }
    }

    if (!body.role_id || !targetSkillId) {
      return NextResponse.json({ error: "role_id and skill_id are required." }, { status: 400 });
    }

    // Check if mapping already exists to prevent duplicate key errors
    const checkRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_role_skill_mapping?filter[role_id][_eq]=${body.role_id}&filter[skill_id][_eq]=${targetSkillId}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      const existingMapping = checkJson.data?.[0];
      if (existingMapping) {
        // Already mapped: update weight and requirement
        const updateRes = await fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping/${existingMapping.id}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            importance_weight: Number(body.importance_weight ?? 1.0),
            is_required: body.is_required ? 1 : 0,
          }),
        });
        if (updateRes.ok) {
          const updatedJson = await updateRes.json();
          return NextResponse.json(updatedJson.data);
        }
        return NextResponse.json(existingMapping);
      }
    }

    // Insert new mapping
    const payload = {
      role_id: Number(body.role_id),
      skill_id: Number(targetSkillId),
      importance_weight: Number(body.importance_weight ?? 1.0),
      is_required: body.is_required ? 1 : 0,
    };

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_skill_mapping`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.errors?.[0]?.message || "Failed to create role skill mapping.");
    }
    const json = await res.json();

    // Lookup skill name for full hydration
    let resolvedSkillName = body.skill_name;
    if (!resolvedSkillName) {
      const skillLookup = await fetch(`${DIRECTUS_BASE}/items/vs_master_skills/${targetSkillId}`, {
        headers: getHeaders(),
        cache: "no-store",
      }).catch(() => null);
      if (skillLookup?.ok) {
        const sJson = await skillLookup.json();
        resolvedSkillName = sJson.data?.skill_name;
      }
    }

    const createdRecord = {
      id: json.data?.id,
      role_id: Number(body.role_id),
      skill_id: Number(targetSkillId),
      skill_name: resolvedSkillName || `Skill #${targetSkillId}`,
      importance_weight: Number(body.importance_weight ?? 1.0),
      is_required: Boolean(body.is_required),
    };

    return NextResponse.json(createdRecord);
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
