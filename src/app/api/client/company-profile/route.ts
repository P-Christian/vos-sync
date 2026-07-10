// src/app/api/client/company-profile/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/** Resolve user_id from JWT cookie */
function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const id = payload?.user_id ?? payload?.sub ?? payload?.id ?? null;
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// GET — Fetch company profile for logged-in client
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus base URL not configured." },
        { status: 500 }
      );
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Could not resolve user identity from token." },
        { status: 401 }
      );
    }

    // 1. Find company_id via vs_company_user
    const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id,company_user_role,is_primary_contact&limit=1`;
    console.log("[DEBUG] Fetching linkUrl:", linkUrl);
    console.log("[DEBUG] Headers being sent:", getHeaders());
    const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });

    console.log("[DEBUG] linkRes.status:", linkRes.status);
    if (!linkRes.ok) {
      const errorText = await linkRes.text();
      console.error("[DEBUG] linkRes error body:", errorText);
      return NextResponse.json(
        { error: `Failed to resolve company association: ${errorText}` },
        { status: linkRes.status }
      );
    }

    const linkJson = await linkRes.json();
    console.log("[DEBUG] linkJson:", JSON.stringify(linkJson));
    const links = linkJson.data;

    if (!Array.isArray(links) || links.length === 0) {
      return NextResponse.json(
        { error: "No company associated with this account." },
        { status: 404 }
      );
    }

    const companyId = links[0].company_id;

    // 2. Fetch vs_company record
    const companyUrl = `${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=*`;
    console.log("[DEBUG] Fetching companyUrl:", companyUrl);
    const companyRes = await fetch(companyUrl, {
      headers: getHeaders(),
      cache: "no-store",
    });

    console.log("[DEBUG] companyRes.status:", companyRes.status);
    if (!companyRes.ok) {
      const errorText = await companyRes.text();
      console.error("[DEBUG] companyRes error body:", errorText);
      return NextResponse.json(
        { error: `Failed to fetch company profile: ${errorText}` },
        { status: companyRes.status }
      );
    }

    const companyJson = await companyRes.json();
    console.log("[DEBUG] companyJson:", JSON.stringify(companyJson));

    return NextResponse.json({
      company: companyJson.data,
      meta: {
        company_user_role: links[0].company_user_role,
        is_primary_contact: links[0].is_primary_contact,
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/client/company-profile error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// PATCH — Update allowed company fields
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus base URL not configured." },
        { status: 500 }
      );
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Could not resolve user identity from token." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    // Only OWNER or primary contact may update
    const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id,company_user_role&limit=1`;
    const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });
    const linkJson = await linkRes.json();
    const link = linkJson.data?.[0];

    if (!link) {
      return NextResponse.json({ error: "Company association not found." }, { status: 404 });
    }

    if (link.company_user_role !== "OWNER" && link.company_user_role !== "ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission to update this company profile." },
        { status: 403 }
      );
    }

    const companyId = link.company_id;

    // Whitelist updatable fields (exclude verification_status, company_code, is_deleted)
    const ALLOWED_FIELDS = [
      "company_name",
      "company_email",
      "company_contact",
      "company_website",
      "company_description",
      "industry",
      "business_type",
      "company_size",
      "company_province",
      "company_city",
      "company_brgy",
      "company_address",
      "company_zipCode",
    ];

    const safePayload: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        safePayload[key] = body[key];
      }
    }

    if (Object.keys(safePayload).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(safePayload),
    });

    const patchText = await patchRes.text();
    let patchData: unknown = null;
    try {
      patchData = patchText ? JSON.parse(patchText) : null;
    } catch {
      patchData = null;
    }

    if (!patchRes.ok) {
      return NextResponse.json(
        { error: "Failed to update company profile." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Company profile updated successfully.",
      company: (patchData as { data?: unknown })?.data ?? null,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/client/company-profile error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

