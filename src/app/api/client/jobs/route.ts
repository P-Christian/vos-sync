// src/app/api/client/jobs/route.ts
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

async function resolveCompany(userId: number): Promise<{
  companyId: number | null;
  verification_status: string | null;
  error: string | null;
}> {
  const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`;
  const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });
  const linkJson = await linkRes.json();
  const link = linkJson.data?.[0];
  if (!link) return { companyId: null, verification_status: null, error: "No company associated." };

  const companyRes = await fetch(
    `${DIRECTUS_BASE}/items/vs_company/${link.company_id}?fields=company_id,verification_status`,
    { headers: getHeaders(), cache: "no-store" }
  );
  const companyJson = await companyRes.json();
  const company = companyJson.data;

  return {
    companyId: company?.company_id ?? null,
    verification_status: company?.verification_status ?? null,
    error: null,
  };
}

// ─────────────────────────────────────────────
// GET — List all job postings for the company
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { companyId, error } = await resolveCompany(userId);
    if (error || !companyId)
      return NextResponse.json({ error: error ?? "Company not found." }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let filterQuery = `filter[company_id][_eq]=${companyId}&filter[is_deleted][_eq]=0`;
    if (status && status !== "ALL") filterQuery += `&filter[status][_eq]=${status}`;

    const jobsUrl = `${DIRECTUS_BASE}/items/vs_job_posting?${filterQuery}&sort[]=-created_at&fields=*`;
    const jobsRes = await fetch(jobsUrl, { headers: getHeaders(), cache: "no-store" });
    const jobsJson = await jobsRes.json();

    return NextResponse.json({ jobs: jobsJson.data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// POST — Create a new job posting
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const { companyId, verification_status, error } = await resolveCompany(userId);
    if (error || !companyId)
      return NextResponse.json({ error: error ?? "Company not found." }, { status: 404 });

    // BUSINESS RULE: Only VERIFIED companies may post jobs
    if (verification_status !== "VERIFIED") {
      return NextResponse.json(
        {
          error:
            "Job posting is only available for verified companies. Your account is currently " +
            (verification_status ?? "PENDING") +
            ".",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    // Required fields
    const errors: string[] = [];
    if (!body.job_title?.trim()) errors.push("Job title is required.");
    if (!body.job_type?.trim()) errors.push("Job type is required.");
    if (!body.job_location?.trim()) errors.push("Job location is required.");
    if (!body.salary_min && !body.salary_max && !body.salary_negotiable)
      errors.push("Salary information is required.");

    if (errors.length > 0)
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const jobPayload = {
      company_id: companyId,
      created_by_user_id: userId,
      job_title: body.job_title?.trim(),
      job_description: body.job_description?.trim() || null,
      job_requirements: body.job_requirements?.trim() || null,
      job_type: body.job_type?.trim(),
      job_location: body.job_location?.trim(),
      job_department: body.job_department?.trim() || null,
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      salary_negotiable: body.salary_negotiable ?? false,
      experience_level: body.experience_level?.trim() || null,
      status: body.status ?? "ACTIVE",
      is_deleted: 0,
      created_at: nowPH,
    };

    const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(jobPayload),
    });

    const createJson = await createRes.json();

    if (!createRes.ok) {
      return NextResponse.json(
        { error: createJson.errors?.[0]?.message ?? "Failed to create job posting." },
        { status: createRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Job posting created successfully.",
      job: createJson.data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

