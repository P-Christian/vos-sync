// src/app/api/client/company-profile/submit/route.ts
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
// POST — Submit company profile for verification
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

    // 1. Resolve company association
    const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id,company_user_role&limit=1`;
    const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });
    const linkJson = await linkRes.json();
    const link = linkJson.data?.[0];

    if (!link) {
      return NextResponse.json(
        { error: "No company associated with this account." },
        { status: 404 }
      );
    }

    if (link.company_user_role !== "OWNER" && link.company_user_role !== "ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission to submit this company profile." },
        { status: 403 }
      );
    }

    const companyId = link.company_id;

    // 2. Fetch current company data to validate required fields
    const companyUrl = `${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=*`;
    const companyRes = await fetch(companyUrl, { headers: getHeaders(), cache: "no-store" });

    if (!companyRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch company profile for validation." },
        { status: companyRes.status }
      );
    }

    const companyJson = await companyRes.json();
    const company = companyJson.data;

    if (!company) {
      return NextResponse.json({ error: "Company record not found." }, { status: 404 });
    }

    // 3. Block re-submission if already Pending or Verified
    if (
      company.verification_status === "PENDING_VERIFICATION" ||
      company.verification_status === "VERIFIED"
    ) {
      return NextResponse.json(
        {
          error:
            company.verification_status === "VERIFIED"
              ? "This company profile is already verified."
              : "This profile is already pending verification.",
        },
        { status: 400 }
      );
    }

    // 4. Validate required fields before allowing submission
    const missingFields: string[] = [];

    const required: Array<{ key: string; label: string }> = [
      { key: "company_name", label: "Company Display Name" },
      { key: "company_legal_name", label: "Legal Company Name" },
      { key: "company_email", label: "Business Email" },
      { key: "company_contact", label: "Contact Number" },
      { key: "company_description", label: "Company Description" },
      { key: "industry_id", label: "Industry" },
      { key: "company_size_id", label: "Company Size" },
      { key: "company_province", label: "Province" },
      { key: "company_city", label: "City / Municipality" },
      { key: "company_address", label: "Street Address" },
      { key: "company_logo", label: "Company Logo" },
    ];

    for (const { key, label } of required) {
      const val = company[key];
      if (val === null || val === undefined || String(val).trim() === "") {
        missingFields.push(label);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Please complete the following required fields before submitting: ${missingFields.join(", ")}.`,
          missingFields,
        },
        { status: 422 }
      );
    }

    // 5. Patch company record: set status to PENDING_VERIFICATION + submitted_at
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const patchPayload = {
      verification_status: "PENDING_VERIFICATION",
      submitted_at: now,
    };

    const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_company/${companyId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(patchPayload),
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
        { error: "Failed to submit company profile for verification." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Company profile submitted for verification successfully.",
      company: (patchData as { data?: unknown })?.data ?? null,
    });
  } catch (err: unknown) {
    console.error("POST /api/client/company-profile/submit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
