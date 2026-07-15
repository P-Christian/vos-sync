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

/** Recalculate company profile completion percentage */
function calculateCompletionPercent(company: Record<string, unknown>): number {
  const fields = [
    "company_name",
    "company_legal_name",
    "company_email",
    "company_contact",
    "company_description",
    "industry_id",
    "organization_type_id",
    "company_size_id",
    "year_established",
    "company_province",
    "company_city",
    "company_brgy",
    "company_address",
    "company_zipCode",
    "company_logo",
    "company_cover",
    "registration_no",
    "company_tin",
    "company_website",
  ];

  let filled = 0;
  for (const f of fields) {
    const val = company[f];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      filled++;
    }
  }

  // Check if they have at least one social media link
  const socials = [
    "company_facebook",
    "company_linkedin",
    "company_instagram",
    "company_x",
    "company_youtube",
  ];
  const hasSocial = socials.some((f) => {
    const val = company[f];
    return val !== undefined && val !== null && String(val).trim() !== "";
  });
  if (hasSocial) {
    filled++;
  }

  const total = fields.length + 1; // 19 fields + 1 for any social media
  return Math.round((filled / total) * 100);
}

// ─────────────────────────────────────────────
// GET — Fetch company profile for logged-in client
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // ─────────────────────────────────────────────
    // DIRECTUS PROXY — for master data collections
    // (uses static token only — no user JWT needed)
    // ─────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const directusCollection = searchParams.get("directusCollection");

    if (directusCollection) {
      if (!DIRECTUS_BASE) {
        return NextResponse.json({ error: "Directus base URL not configured." }, { status: 500 });
      }
      const proxyParams = new URLSearchParams(searchParams.toString());
      proxyParams.delete("directusCollection");
      if (!proxyParams.has("limit")) proxyParams.set("limit", "-1");
      const target = `${DIRECTUS_BASE}/items/${encodeURIComponent(directusCollection)}${proxyParams.toString() ? `?${proxyParams.toString()}` : ""}`;
      const res = await fetch(target, { method: "GET", headers: getHeaders(), cache: "no-store" });
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") || "application/json" },
      });
    }

    // ─────────────────────────────────────────────
    // AUTH CHECK
    // ─────────────────────────────────────────────
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

    const companyData = companyJson.data ?? null;
    const computedPercent = companyData ? calculateCompletionPercent(companyData) : 0;

    return NextResponse.json({
      company: companyData
        ? { ...companyData, profile_completion_percent: computedPercent }
        : null,
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
// POST — Setup / Onboard a new company profile
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
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

    // Check if company association already exists
    const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`;
    const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });
    const linkJson = await linkRes.json();
    if (linkJson.data && linkJson.data.length > 0) {
      return NextResponse.json(
        { error: "A company profile is already associated with this account." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const {
      company_name,
      company_legal_name,
      company_email,
      company_contact,
      company_description,
      registration_no,
      company_tin,
    } = body;

    // Field Validations
    if (!company_name?.trim()) {
      return NextResponse.json({ error: "Company display name is required." }, { status: 400 });
    }
    if (!company_legal_name?.trim()) {
      return NextResponse.json({ error: "Legal company name is required." }, { status: 400 });
    }
    if (!company_email?.trim()) {
      return NextResponse.json({ error: "Company email is required." }, { status: 400 });
    }
    if (!company_contact?.trim()) {
      return NextResponse.json({ error: "Company contact number is required." }, { status: 400 });
    }
    if (!company_description?.trim()) {
      return NextResponse.json({ error: "Company description is required." }, { status: 400 });
    }

    // 1. Create company record in vs_company
    const randomCode = `COMP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const companyPayload = {
      company_name: company_name.trim(),
      company_legal_name: company_legal_name.trim(),
      company_email: company_email.trim(),
      company_contact: company_contact.trim(),
      company_description: company_description.trim(),
      company_code: randomCode,
      registration_no: registration_no?.trim() || null,
      company_tin: company_tin?.trim() || null,
      verification_status: "DRAFT",
      is_active: 1,
      is_deleted: 0,
      created_by_user_id: userId,
    };

    const companyRes = await fetch(`${DIRECTUS_BASE}/items/vs_company`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(companyPayload),
    });

    const companyText = await companyRes.text();
    let companyData: { data?: { company_id?: number }; errors?: Array<{ message?: string }> } | null = null;
    try {
      companyData = companyText ? JSON.parse(companyText) : null;
    } catch {
      companyData = null;
    }

    if (!companyRes.ok) {
      return NextResponse.json(
        { error: companyData?.errors?.[0]?.message || "Failed to create company record." },
        { status: companyRes.status }
      );
    }

    const companyId = companyData?.data?.company_id;
    if (!companyId) {
      return NextResponse.json(
        { error: "Failed to retrieve the created company ID." },
        { status: 500 }
      );
    }

    // 2. Link company to user with OWNER role
    const linkPayload = {
      company_id: companyId,
      user_id: userId,
      company_user_role: "OWNER",
      is_primary_contact: 1,
      status: "ACTIVE",
    };

    const newLinkRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_user`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(linkPayload),
    });

    if (!newLinkRes.ok) {
      // Rollback company creation
      await fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return NextResponse.json(
        { error: "Failed to link company with your user account." },
        { status: newLinkRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Company setup completed successfully.",
      company: companyData?.data ?? null,
    });
  } catch (err: unknown) {
    console.error("POST /api/client/company-profile error:", err);
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
      "company_legal_name",
      "company_email",
      "company_contact",
      "company_website",
      "company_description",
      "company_mission",
      "company_vision",
      "company_culture",
      "company_benefits",
      "industry_id",
      "organization_type_id",
      "company_size_id",
      "year_established",
      "company_province",
      "company_city",
      "company_brgy",
      "company_address",
      "company_zipCode",
      "registration_no",
      "company_tin",
      "company_logo",
      "company_cover",
      "company_facebook",
      "company_linkedin",
      "company_instagram",
      "company_x",
      "company_youtube",
      "company_tags",
      "is_public",
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

    if (
      "company_email" in safePayload &&
      typeof safePayload.company_email === "string" &&
      safePayload.company_email.trim()
    ) {
      const emailToCheck = safePayload.company_email.trim();
      const checkUrl = `${DIRECTUS_BASE}/items/vs_company?filter[company_email][_eq]=${encodeURIComponent(
        emailToCheck
      )}&filter[company_id][_neq]=${companyId}&fields=company_id&limit=1`;
      const checkRes = await fetch(checkUrl, { headers: getHeaders(), cache: "no-store" });
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        if (checkJson.data && checkJson.data.length > 0) {
          return NextResponse.json(
            { error: "This email address is already registered to another company profile." },
            { status: 400 }
          );
        }
      }
    }

    // Fetch existing company details to merge for completion recalculation
    const companyUrl = `${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=*`;
    const companyRes = await fetch(companyUrl, { headers: getHeaders(), cache: "no-store" });
    let existingCompany: Record<string, unknown> = {};
    if (companyRes.ok) {
      const companyJson = await companyRes.json();
      existingCompany = companyJson.data ?? {};
    }

    const mergedCompany = { ...existingCompany, ...safePayload };
    const computedPercent = calculateCompletionPercent(mergedCompany);
    safePayload.profile_completion_percent = computedPercent;

    console.log("[DEBUG] PATCH safePayload:", JSON.stringify(safePayload));
    const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(safePayload),
    });

    const patchText = await patchRes.text();
    console.log("[DEBUG] PATCH response:", patchText);
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

