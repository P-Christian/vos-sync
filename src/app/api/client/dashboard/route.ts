// src/app/api/client/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

interface JobPostingRecord {
  job_id: number;
  job_title: string;
  job_department?: string;
  job_location: string;
  status: string;
  created_at?: string;
}

interface ApplicationRecord {
  application_id: number;
  job_id: number;
  applicant_name?: string;
  applicant_email?: string;
  job_title?: string;
  experience?: string;
  application_status: string;
  applied_at?: string;
}

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

    // 1. Resolve company associated with user
    const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`;
    const linkRes = await fetch(linkUrl, { headers: getHeaders(), cache: "no-store" });
    if (!linkRes.ok) {
      return NextResponse.json({ error: "Failed to query company association." }, { status: linkRes.status });
    }

    const linkJson = await linkRes.json();
    const companyId = linkJson.data?.[0]?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account." },
        { status: 404 }
      );
    }

    // 2. Fetch vs_company record — only query fields confirmed in Directus schema
    const VS_COMPANY_FIELDS = [
      "company_id", "company_name", "company_code",
      "company_legal_name",
      "company_address", "company_brgy", "company_city", "company_province", "company_zipCode",
      "registration_no", "company_tin",
      "company_contact", "company_email",
      "company_logo", "company_cover",
      "company_facebook", "company_linkedin", "company_instagram", "company_x", "company_youtube",
      "company_website", "company_description",
      "company_mission", "company_vision", "company_culture", "company_benefits",
      "company_tags",
      "organization_type_id", "year_established", "industry_id", "company_size_id",
      "verification_status", "rejection_reason",
      "profile_completion_percent", "is_public", "is_active",
      "submitted_at", "verified_by_user_id", "verified_at",
      "created_by_user_id", "updated_by_user_id", "created_at", "updated_at",
    ].join(",");
    const companyUrl = `${DIRECTUS_BASE}/items/vs_company/${companyId}?fields=${VS_COMPANY_FIELDS}`;
    const companyRes = await fetch(companyUrl, { headers: getHeaders(), cache: "no-store" });
    if (!companyRes.ok) {
      return NextResponse.json({ error: "Failed to fetch company profile details." }, { status: companyRes.status });
    }
    const companyJson = await companyRes.json();
    const companyData = companyJson.data;

    // 3. Fetch vs_job_posting records
    const jobsUrl = `${DIRECTUS_BASE}/items/vs_job_posting?filter[company_id][_eq]=${companyId}&filter[is_deleted][_eq]=0&sort[]=-created_at&limit=100&fields=*`;
    const jobsRes = await fetch(jobsUrl, { headers: getHeaders(), cache: "no-store" });
    if (!jobsRes.ok) {
      return NextResponse.json({ error: "Failed to query jobs list." }, { status: jobsRes.status });
    }
    const jobsJson = await jobsRes.json();
    const jobsList: JobPostingRecord[] = jobsJson.data ?? [];

    const jobIds: number[] = jobsList.map((j) => j.job_id);

    // 4. Fetch vs_application records
    let applicantsList: ApplicationRecord[] = [];
    if (jobIds.length > 0) {
      const appUrl = `${DIRECTUS_BASE}/items/vs_application?filter[job_id][_in]=${jobIds.join(",")}&sort[]=-applied_at&limit=100&fields=*`;
      const appRes = await fetch(appUrl, { headers: getHeaders(), cache: "no-store" });
      if (appRes.ok) {
        const appJson = await appRes.json();
        applicantsList = appJson.data ?? [];
      }
    }

    // 5. Fetch interviews
    let pendingInterviewsCount = 0;
    const interviewUrl = `${DIRECTUS_BASE}/items/vs_interview?filter[company_id][_eq]=${companyId}&filter[interview_status][_in]=CONFIRMED,RESCHEDULED&fields=interview_id`;
    const interviewRes = await fetch(interviewUrl, { headers: getHeaders(), cache: "no-store" });
    if (interviewRes.ok) {
      const interviewJson = await interviewRes.json();
      pendingInterviewsCount = (interviewJson.data ?? []).length;
    }

    // 6. Map stats
    const activeJobs = jobsList.filter((j) => j.status === "ACTIVE").length;
    const totalJobs = jobsList.length;
    const totalApplicants = applicantsList.length;
    const hiredCount = applicantsList.filter((a) => a.application_status === "HIRED").length;

    // 7. Format jobs list
    const formattedJobs = jobsList.slice(0, 5).map((j) => ({
      id: j.job_id,
      title: j.job_title,
      department: j.job_department || "General",
      location: j.job_location,
      applicantsCount: applicantsList.filter((a) => a.job_id === j.job_id).length,
      status: j.status,
      postedAt: j.created_at || new Date().toISOString(),
    }));

    // 8. Format applicants list
    const formattedApplicants = applicantsList.slice(0, 5).map((a) => ({
      id: a.application_id,
      name: a.applicant_name || "Applicant",
      jobTitle: jTitleLookup(a.job_id, jobsList) || a.job_title || "Unknown Role",
      email: a.applicant_email || "",
      experience: a.experience || "N/A",
      status: a.application_status,
      appliedDate: a.applied_at || new Date().toISOString(),
    }));

    return NextResponse.json({
      company: companyData,
      stats: {
        totalJobs,
        activeJobs,
        totalApplicants,
        pendingInterviews: pendingInterviewsCount,
        hiredCount,
      },
      recentJobs: formattedJobs,
      recentApplicants: formattedApplicants,
    });
  } catch (error: unknown) {
    console.error("Dashboard API Route Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function jTitleLookup(jobId: number, jobs: JobPostingRecord[]): string {
  const match = jobs.find((j) => j.job_id === jobId);
  return match ? match.job_title : "";
}
