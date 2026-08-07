// src/app/api/vos-admin/job-roles/keywords/route.ts

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
    const roleId = searchParams.get("role_id");
    const filterParam = roleId ? `&filter[role_id][_eq]=${roleId}` : "";

    const [aliasRes, rolesRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_role_title_alias?limit=-1${filterParam}`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_title?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
    ]);

    const aliasJson = aliasRes.ok ? await aliasRes.json() : {};
    const rolesJson = rolesRes.ok ? await rolesRes.json() : {};

    const rawAliases = aliasJson.data ?? [];
    const rolesList = rolesJson.data ?? [];
    const rolesMap = new Map(rolesList.map((r: { role_id: number; role_name: string }) => [Number(r.role_id), r.role_name]));

    const formatted = rawAliases.map((a: { alias_id: number; role_id: unknown; alias_name: string; normalized_alias?: string; match_weight?: number; is_primary?: boolean }) => {
      const rId = typeof a.role_id === "object" && a.role_id !== null ? (a.role_id as { role_id: number }).role_id : Number(a.role_id);
      const rName = typeof a.role_id === "object" && a.role_id !== null ? (a.role_id as { role_name: string }).role_name : rolesMap.get(rId);

      return {
        alias_id: a.alias_id,
        role_id: rId,
        role_name: rName || `Role #${rId}`,
        alias_name: a.alias_name,
        normalized_alias: a.normalized_alias,
        match_weight: Number(a.match_weight ?? 1.0),
        is_primary: Boolean(a.is_primary),
      };
    });

    return NextResponse.json({ keywords: formatted });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_title_alias`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create search keyword.");
    const json = await res.json();
    return NextResponse.json(json.data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { alias_id, ...updates } = body;
    if (!alias_id) return NextResponse.json({ error: "Alias ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_title_alias/${alias_id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update search keyword.");
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
    if (!id) return NextResponse.json({ error: "Alias ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_title_alias/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete search keyword.");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}
