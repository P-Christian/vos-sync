// src/app/api/vos-admin/job-roles/categories/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticated-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

async function authorizeAdmin(req: NextRequest) {
  const session = await authenticateRequest(req);
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const roleName = (session.roleName || "").toUpperCase();
  if (session.roleId !== 3 && roleName !== "ADMIN") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: Restricted to administrators." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session && process.env.NEXT_PUBLIC_AUTH_DISABLED !== "true") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_category?limit=-1`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch job categories.");
    const json = await res.json();
    return NextResponse.json({ categories: json.data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if (!auth.authorized) return auth.response;
    const body = await req.json();
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_category`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create job category.");
    const json = await res.json();
    return NextResponse.json(json.data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { category_id, ...updates } = body;
    if (!category_id) return NextResponse.json({ error: "Category ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_category/${category_id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update job category.");
    const json = await res.json();
    return NextResponse.json(json.data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Category ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_role_category/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete job category.");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}
