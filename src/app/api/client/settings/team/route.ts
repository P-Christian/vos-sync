// src/app/api/client/settings/team/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return headers;
}

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf8")
    );
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id !== null ? Number(id) : null;
  } catch {
    return null;
  }
}

async function getCompanyId(userId: number): Promise<number | null> {
  const res = await fetch(
    `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`,
    { headers: getHeaders(), cache: "no-store" }
  );
  const json = await res.json();
  return json.data?.[0]?.company_id ?? null;
}

// ─── GET — Fetch company team members ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const companyId = await getCompanyId(userId);
    if (!companyId) {
      return NextResponse.json({ members: [] });
    }

    // Fetch company_user records
    const teamRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_user?filter[company_id][_eq]=${companyId}&fields=company_user_id,company_id,user_id,company_user_role,is_primary_contact,status,created_at,user_id.user_fname,user_id.user_lname,user_id.user_email,user_id.user_contact,user_id.profile_image_url&limit=100`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!teamRes.ok) {
      const text = await teamRes.text();
      console.error("Directus fetch team error:", text);
      return NextResponse.json(
        { error: "Failed to fetch company team members." },
        { status: teamRes.status }
      );
    }

    const teamJson = await teamRes.json();
    const rawMembers: Record<string, unknown>[] = teamJson.data ?? [];

    const members = rawMembers.map((m) => {
      const u = (m.user_id as Record<string, unknown>) || {};
      return {
        company_user_id: m.company_user_id,
        company_id: m.company_id,
        user_id: typeof m.user_id === "object" ? (u.user_id ?? 0) : m.user_id,
        user_fname: u.user_fname ?? "Team",
        user_lname: u.user_lname ?? "Member",
        user_email: u.user_email ?? "",
        user_contact: u.user_contact ?? null,
        profile_image_url: u.profile_image_url ?? null,
        company_user_role: m.company_user_role ?? "MEMBER",
        is_primary_contact: m.is_primary_contact === 1 || m.is_primary_contact === true,
        status: m.status ?? "ACTIVE",
        created_at: m.created_at ?? null,
      };
    });

    return NextResponse.json({ members });
  } catch (err: unknown) {
    console.error("GET /api/client/settings/team error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH — Modify team member role or active status ─────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const companyUserId = Number(body?.company_user_id);
    const role = body?.role;
    const status = body?.status;

    if (!companyUserId) {
      return NextResponse.json(
        { error: "company_user_id is required." },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (role) updatePayload.company_user_role = role;
    if (status) updatePayload.status = status;

    const patchRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_user/${companyUserId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updatePayload),
      }
    );

    if (!patchRes.ok) {
      const text = await patchRes.text();
      console.error("Directus patch team error:", text);
      return NextResponse.json(
        { error: "Failed to update team member role." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("PATCH /api/client/settings/team error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
