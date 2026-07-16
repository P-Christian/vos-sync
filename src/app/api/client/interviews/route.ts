// src/app/api/client/interviews/route.ts
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
  } catch { return null; }
}

async function getCompanyId(userId: number): Promise<number | null> {
  const res = await fetch(
    `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`,
    { headers: getHeaders(), cache: "no-store" }
  );
  const json = await res.json();
  return json.data?.[0]?.company_id ?? null;
}

interface DirectusInterview {
  interview_id: number;
  company_id: number;
  application_id: number;
  interviewer_user_id?: number | null;
  interview_date: string;
  interview_time: string;
  interview_format: string;
  meeting_link?: string | null;
  meeting_location?: string | null;
  interview_notes?: string | null;
  interview_status: string;
  created_at?: string;
}

interface ApplicationSummary {
  application_id: number;
  user_id: number;
  job_id: number;
}

interface DirectusUser {
  user_id: number;
  user_fname: string;
  user_lname: string;
}

interface DirectusJob {
  job_id: number;
  job_title: string;
}

// GET — List interviews for the company
export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Company not found." }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let filterQuery = `filter[company_id][_eq]=${companyId}`;
    if (status && status !== "ALL") filterQuery += `&filter[interview_status][_eq]=${status}`;

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_interview?${filterQuery}&sort[]=interview_date&fields=*`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    const rawInterviews: DirectusInterview[] = json.data ?? [];

    if (rawInterviews.length === 0) {
      return NextResponse.json({ interviews: [] });
    }

    // Resolve applications for these interviews
    const appIds = [...new Set(rawInterviews.map((iv) => iv.application_id).filter(Boolean))];
    const appsMap: Record<number, { user_id: number; job_id: number }> = {};
    if (appIds.length > 0) {
      const appsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_application?filter[application_id][_in]=${appIds.join(",")}&fields=application_id,user_id,job_id&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (appsRes.ok) {
        const appsJson = await appsRes.json();
        const appsList: ApplicationSummary[] = appsJson.data ?? [];
        appsList.forEach((a) => {
          appsMap[a.application_id] = { user_id: a.user_id, job_id: a.job_id };
        });
      }
    }

    // Resolve user IDs and job IDs
    const userIds = [...new Set(Object.values(appsMap).map((a) => a.user_id).filter(Boolean))];
    const jobIds = [...new Set(Object.values(appsMap).map((a) => a.job_id).filter(Boolean))];

    const usersMap: Record<number, string> = {};
    if (userIds.length > 0) {
      const usersRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        const usersList: DirectusUser[] = usersJson.data ?? [];
        usersList.forEach((u) => {
          usersMap[u.user_id] = `${u.user_fname} ${u.user_lname}`.trim();
        });
      }
    }

    const jobsMap: Record<number, string> = {};
    if (jobIds.length > 0) {
      const jobsRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (jobsRes.ok) {
        const jobsJson = await jobsRes.json();
        const jobsList: DirectusJob[] = jobsJson.data ?? [];
        jobsList.forEach((j) => {
          jobsMap[j.job_id] = j.job_title;
        });
      }
    }

    // Enrich interviews
    const interviews = rawInterviews.map((iv) => {
      const app = appsMap[iv.application_id] ?? { user_id: null, job_id: null };
      const applicantName = app.user_id ? (usersMap[app.user_id] ?? `Applicant #${app.user_id}`) : "Unknown Candidate";
      const jobTitle = app.job_id ? (jobsMap[app.job_id] ?? "Unknown Role") : "Unknown Role";
      return {
        ...iv,
        applicant_name: applicantName,
        job_title: jobTitle,
      };
    });

    return NextResponse.json({ interviews });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — Create a new interview schedule
export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const companyId = await getCompanyId(userId);
    if (!companyId) return NextResponse.json({ error: "Company not found." }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    // Required field validation
    const errors: string[] = [];
    if (!body.application_id) errors.push("Application ID is required.");
    if (!body.interview_date) errors.push("Interview date is required.");
    if (!body.interview_time) errors.push("Interview time is required.");
    if (!body.interview_format) errors.push("Interview format is required.");

    if (errors.length > 0)
      return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const interviewPayload = {
      company_id: companyId,
      application_id: body.application_id,
      interviewer_user_id: userId,
      interview_date: body.interview_date,
      interview_time: body.interview_time,
      interview_format: body.interview_format, // ONLINE, ONSITE, PHONE
      meeting_link: body.meeting_link?.trim() || null,
      meeting_location: body.meeting_location?.trim() || null,
      interview_notes: body.interview_notes?.trim() || null,
      interview_status: "CONFIRMED",
      created_at: nowPH,
    };

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_interview`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(interviewPayload),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to create interview." },
        { status: res.status }
      );
    }

    // Also update the application status to INTERVIEW_SCHEDULED
    await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${body.application_id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ application_status: "INTERVIEW_SCHEDULED" }),
    });

    return NextResponse.json({
      success: true,
      message: "Interview scheduled successfully.",
      interview: json.data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
