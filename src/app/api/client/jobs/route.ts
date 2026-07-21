/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/client/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as jobService from "./service.directus";

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

async function attachCompanyToJob(job: any) {
  if (!job || !job.company_id) return job;
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company/${job.company_id}?fields=*`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return job;
    const json = await res.json();
    const companyData = json.data;
    if (!companyData) return job;

    return {
      ...job,
      company: {
        company_id: companyData.company_id,
        company_name: companyData.company_name,
        company_logo: companyData.company_logo,
        company_cover: companyData.company_cover,
        company_email: companyData.company_email,
        company_contact: companyData.company_contact,
        company_address: companyData.company_address,
        company_city: companyData.company_city,
        company_province: companyData.company_province,
        company_facebook: companyData.company_facebook,
        company_linkedin: companyData.company_linkedin,
        company_instagram: companyData.company_instagram,
        company_x: companyData.company_x,
        company_youtube: companyData.company_youtube,
      },
      // fallback flat fields
      company_name: companyData.company_name || null,
      company_logo: companyData.company_logo || null,
      company_cover: companyData.company_cover || null,
      company_email: companyData.company_email || null,
      company_contact: companyData.company_contact || null,
      company_address: companyData.company_address || null,
      company_city: companyData.company_city || null,
      company_province: companyData.company_province || null,
      company_facebook: companyData.company_facebook || null,
      company_linkedin: companyData.company_linkedin || null,
      company_instagram: companyData.company_instagram || null,
      company_x: companyData.company_x || null,
      company_youtube: companyData.company_youtube || null,
    };
  } catch (err) {
    console.error("attachCompanyToJob error:", err);
    return job;
  }
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

    const jobs = await jobService.getJobs(companyId, status);
    const jobsWithCompany = await Promise.all(jobs.map((j) => attachCompanyToJob(j)));

    return NextResponse.json({ jobs: jobsWithCompany });
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

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    // Required fields
    const errors: string[] = [];
    if (!body.job_title?.trim()) errors.push("Job title is required.");
    if (!body.job_type?.trim()) errors.push("Job type is required.");
    if (!body.job_location?.trim()) errors.push("Job location is required.");
    if (!body.salary_min && !body.salary_max && !body.salary_negotiable)
      errors.push("Salary information is required.");

    // BUSINESS RULE: Only VERIFIED companies can publish active jobs
    // Unverified companies may save drafts but cannot submit active listings
    const targetStatus = body.status ?? "ACTIVE";
    if (targetStatus === "ACTIVE" && verification_status !== "VERIFIED") {
      return NextResponse.json(
        {
          error:
            "Job posting is only available for verified companies. Your account is currently " +
            (verification_status ?? "PENDING") +
            ". You may save it as a DRAFT instead.",
        },
        { status: 403 }
      );
    }

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
      job_description: body.job_description || null,
      job_requirements: body.job_requirements || null,
      job_type: body.job_type?.trim(),
      job_location: body.job_location?.trim(),
      job_department: body.job_department?.trim() || null,
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      salary_negotiable: body.salary_negotiable ?? false,
      experience_level: body.experience_level?.trim() || null,
      status: targetStatus,
      is_deleted: 0,
      created_at: nowPH,
    };

    const createdJob = await jobService.createJob(jobPayload);
    const jobWithCompany = await attachCompanyToJob(createdJob);

    return NextResponse.json({
      success: true,
      message: "Job posting created successfully.",
      job: jobWithCompany,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
