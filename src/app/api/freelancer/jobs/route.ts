// src/app/api/freelancer/jobs/route.ts
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — fetch relation data in batches
// ─────────────────────────────────────────────────────────────────────────────

async function getJobSkills(
  jobIds: number[]
): Promise<Record<number, { id: number; skill_name: string }[]>> {
  const result: Record<number, { id: number; skill_name: string }[]> = {};
  jobIds.forEach((id) => { result[id] = []; });
  if (jobIds.length === 0) return result;

  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_skills_map?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,skill_id,skill_id.id,skill_id.skill_name&limit=1000`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return result;
    const json = await res.json();
    const maps: { job_id: number; skill_id: number | { id: number; skill_name?: string } }[] = json.data ?? [];
    maps.forEach((m) => {
      const jobId = m.job_id;
      if (!result[jobId]) result[jobId] = [];
      if (m.skill_id && typeof m.skill_id === "object") {
        result[jobId].push({ id: m.skill_id.id, skill_name: m.skill_id.skill_name ?? "" });
      }
    });
  } catch (err) {
    console.error("Error fetching job skills:", err);
  }
  return result;
}

async function getJobBenefits(jobIds: number[]): Promise<Record<number, string[]>> {
  const result: Record<number, string[]> = {};
  jobIds.forEach((id) => { result[id] = []; });
  if (jobIds.length === 0) return result;

  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_benefits_map?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,benefit_id,benefit_id.id,benefit_id.benefit_name&limit=1000`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return result;
    const json = await res.json();
    const maps: { job_id: number; benefit_id: number | { id: number; benefit_name?: string } }[] = json.data ?? [];
    maps.forEach((m) => {
      if (!result[m.job_id]) result[m.job_id] = [];
      if (m.benefit_id && typeof m.benefit_id === "object" && m.benefit_id.benefit_name) {
        result[m.job_id].push(m.benefit_id.benefit_name);
      }
    });
  } catch (err) {
    console.error("Error fetching job benefits:", err);
  }
  return result;
}

async function getJobScreeningQuestions(jobIds: number[]): Promise<Record<number, string[]>> {
  const result: Record<number, string[]> = {};
  jobIds.forEach((id) => { result[id] = []; });
  if (jobIds.length === 0) return result;

  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_screening_question?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,question_text&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return result;
    const json = await res.json();
    const questions: { job_id: number; question_text: string }[] = json.data ?? [];
    questions.forEach((q) => {
      if (!result[q.job_id]) result[q.job_id] = [];
      result[q.job_id].push(q.question_text);
    });
  } catch (err) {
    console.error("Error fetching screening questions:", err);
  }
  return result;
}

interface CompanyEnriched {
  name: string;
  logo: string | null;
  cover: string | null;
  email: string | null;
  contact: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  facebook: string | null;
  linkedin: string | null;
  instagram: string | null;
  x: string | null;
  youtube: string | null;
}

async function getCompanyNames(companyIds: number[]): Promise<Record<number, CompanyEnriched>> {
  const result: Record<number, CompanyEnriched> = {};
  if (companyIds.length === 0) return result;

  const companyFields = [
    "company_id", "company_name", "company_logo", "company_cover",
    "company_email", "company_contact", "company_address", "company_city", "company_province",
    "company_facebook", "company_linkedin", "company_instagram", "company_x", "company_youtube"
  ].join(",");

  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&fields=${companyFields}&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return result;
    const json = await res.json();
    const companies: {
      company_id: number;
      company_name: string;
      company_logo?: string | null;
      company_cover?: string | null;
      company_email?: string | null;
      company_contact?: string | null;
      company_address?: string | null;
      company_city?: string | null;
      company_province?: string | null;
      company_facebook?: string | null;
      company_linkedin?: string | null;
      company_instagram?: string | null;
      company_x?: string | null;
      company_youtube?: string | null;
    }[] = json.data ?? [];
    companies.forEach((c) => {
      result[c.company_id] = {
        name: c.company_name,
        logo: c.company_logo ?? null,
        cover: c.company_cover ?? null,
        email: c.company_email ?? null,
        contact: c.company_contact ?? null,
        address: c.company_address ?? null,
        city: c.company_city ?? null,
        province: c.company_province ?? null,
        facebook: c.company_facebook ?? null,
        linkedin: c.company_linkedin ?? null,
        instagram: c.company_instagram ?? null,
        x: c.company_x ?? null,
        youtube: c.company_youtube ?? null,
      };
    });
  } catch (err) {
    console.error("Error fetching companies:", err);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Public listing of ACTIVE jobs for freelancer job browse
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobType = searchParams.get("job_type");
    const workArrangement = searchParams.get("work_arrangement");
    const experienceLevel = searchParams.get("experience_level");

    let filterQuery = "filter[status][_eq]=ACTIVE";
    if (jobType) filterQuery += `&filter[job_type][_eq]=${encodeURIComponent(jobType)}`;
    if (workArrangement) filterQuery += `&filter[work_arrangement][_eq]=${encodeURIComponent(workArrangement)}`;
    if (experienceLevel) filterQuery += `&filter[experience_level][_eq]=${encodeURIComponent(experienceLevel)}`;

    const fields = [
      "job_id", "company_id", "job_title", "job_category", "job_type",
      "work_arrangement", "job_location", "job_department", "number_of_openings",
      "job_description", "job_responsibilities", "job_qualifications",
      "salary_type", "salary_min", "salary_max", "salary_negotiable", "currency",
      "experience_level", "education", "status", "created_at",
    ].join(",");

    const jobsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting?${filterQuery}&sort[]=-created_at&fields=${fields}&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!jobsRes.ok) {
      const err = await jobsRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.errors?.[0]?.message ?? "Failed to load jobs." },
        { status: jobsRes.status }
      );
    }

    const jobsJson = await jobsRes.json();
    const rawJobs: Record<string, unknown>[] = jobsJson.data ?? [];

    if (rawJobs.length === 0) return NextResponse.json({ jobs: [] });

    const jobIds = rawJobs.map((j) => j.job_id as number);
    const companyIds = [...new Set(rawJobs.map((j) => j.company_id as number).filter(Boolean))];

    const [skillsMap, benefitsMap, questionsMap, companiesMap] = await Promise.all([
      getJobSkills(jobIds),
      getJobBenefits(jobIds),
      getJobScreeningQuestions(jobIds),
      getCompanyNames(companyIds),
    ]);

    const jobs = rawJobs.map((j) => {
      const jobId = j.job_id as number;
      const companyId = j.company_id as number;
      const company = companiesMap[companyId] ?? {
        name: null,
        logo: null,
        cover: null,
        email: null,
        contact: null,
        address: null,
        city: null,
        province: null,
        facebook: null,
        linkedin: null,
        instagram: null,
        x: null,
        youtube: null,
      };
      return {
        ...j,
        company_name: company.name,
        company_logo: company.logo,
        company_cover: company.cover,
        company_email: company.email,
        company_contact: company.contact,
        company_address: company.address,
        company_city: company.city,
        company_province: company.province,
        company_facebook: company.facebook,
        company_linkedin: company.linkedin,
        company_instagram: company.instagram,
        company_x: company.x,
        company_youtube: company.youtube,
        skills: skillsMap[jobId] ?? [],
        benefits: benefitsMap[jobId] ?? [],
        screening_questions: questionsMap[jobId] ?? [],
      };
    });

    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    console.error("GET /api/freelancer/jobs error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
