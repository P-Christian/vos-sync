// src/app/api/vos-admin/job-roles/roles/route.ts

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
    const categoryId = searchParams.get("category_id");
    const filterParam = categoryId ? `&filter[category_id][_eq]=${categoryId}` : "";

    const [rolesRes, catRes] = await Promise.all([
      fetch(`${DIRECTUS_BASE}/items/vs_role_title?limit=-1${filterParam}`, { headers: getHeaders(), cache: "no-store" }),
      fetch(`${DIRECTUS_BASE}/items/vs_role_category?limit=-1`, { headers: getHeaders(), cache: "no-store" }),
    ]);

    const rolesJson = rolesRes.ok ? await rolesRes.json() : {};
    const catJson = catRes.ok ? await catRes.json() : {};

    const rawRoles = rolesJson.data ?? [];
    const catList = catJson.data ?? [];
    const catMap = new Map(catList.map((c: any) => [Number(c.category_id), c.category_name]));
    const catCodeMap = new Map(catList.map((c: any) => [Number(c.category_id), c.category_code]));

    const formatted = rawRoles.map((r: any) => {
      const cId = typeof r.category_id === "object" ? r.category_id?.category_id : Number(r.category_id);
      const cName = typeof r.category_id === "object" ? r.category_id?.category_name : catMap.get(cId);
      const cCode = typeof r.category_id === "object" ? r.category_id?.category_code : catCodeMap.get(cId);

      return {
        role_id: r.role_id,
        role_name: r.role_name,
        category_id: cId,
        category_name: cName || `Category #${cId}`,
        category_code: cCode || "",
        experience_level: r.experience_level || "MID",
        is_active: Boolean(r.is_active),
      };
    });

    return NextResponse.json({ roles: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_title`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create standard role.");
    const json = await res.json();
    return NextResponse.json(json.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { role_id, ...updates } = body;
    if (!role_id) return NextResponse.json({ error: "Role ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_title/${role_id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update standard role.");
    const json = await res.json();
    return NextResponse.json(json.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Role ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_title/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete standard role.");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
