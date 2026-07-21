/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/client/jobs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as jobService from "../service.directus";

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

// GET — Fetch single job
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await jobService.getJob(id);
    const jobWithCompany = await attachCompanyToJob(job);
    return NextResponse.json({ job: jobWithCompany });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH — Update job
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    const ALLOWED_FIELDS = [
      "job_title",
      "job_description",
      "job_requirements",
      "job_type",
      "job_location",
      "job_department",
      "salary_min",
      "salary_max",
      "salary_negotiable",
      "experience_level",
      "status",
    ];

    const safePayload: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) safePayload[key] = body[key];
    }

    const updatedJob = await jobService.updateJob(id, safePayload);
    const jobWithCompany = await attachCompanyToJob(updatedJob);

    return NextResponse.json({ success: true, job: jobWithCompany });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — Soft-delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await jobService.deleteJob(id);
    return NextResponse.json({ success: true, message: "Job posting closed." });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
