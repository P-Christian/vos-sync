// src/app/api/freelancer/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

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

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch logged-in freelancer's own applications
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    // Fetch applications for this user
    const appRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[user_id][_eq]=${userId}&sort[]=-applied_at&fields=*&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!appRes.ok) {
      const err = await appRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.errors?.[0]?.message ?? "Failed to load applications." },
        { status: appRes.status }
      );
    }

    const appJson = await appRes.json();
    const applications: Record<string, unknown>[] = appJson.data ?? [];

    if (applications.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    // Enrich with job details (title, type, location, work_arrangement)
    const jobIds = [...new Set(applications.map((a) => a.job_id as number))];
    const jobsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting?filter[job_id][_in]=${jobIds.join(",")}&fields=job_id,job_title,job_type,job_location,work_arrangement,company_id&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );

    const jobsMap: Record<number, Record<string, unknown>> = {};
    if (jobsRes.ok) {
      const jobsJson = await jobsRes.json();
      const jobs: Record<string, unknown>[] = jobsJson.data ?? [];
      jobs.forEach((j) => {
        jobsMap[j.job_id as number] = j;
      });
    }

    // Enrich with company names
    const companyIds = [
      ...new Set(
        Object.values(jobsMap)
          .map((j) => j.company_id as number)
          .filter(Boolean)
      ),
    ];
    const companyMap: Record<number, string> = {};
    if (companyIds.length > 0) {
      const compRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company?filter[company_id][_in]=${companyIds.join(",")}&fields=company_id,company_name&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (compRes.ok) {
        const compJson = await compRes.json();
        const companies: Record<string, unknown>[] = compJson.data ?? [];
        companies.forEach((c) => {
          companyMap[c.company_id as number] = c.company_name as string;
        });
      }
    }

    // Merge all data
    const enriched = applications.map((app) => {
      const job = jobsMap[app.job_id as number] ?? {};
      const companyId = job.company_id as number;
      return {
        ...app,
        job_title: job.job_title ?? null,
        job_type: job.job_type ?? null,
        job_location: job.job_location ?? null,
        work_arrangement: job.work_arrangement ?? null,
        company_name: companyId ? (companyMap[companyId] ?? null) : null,
      };
    });

    return NextResponse.json({ applications: enriched });
  } catch (err: unknown) {
    console.error("GET /api/freelancer/applications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Submit a new job application
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = getUserIdFromToken(token);
    if (!userId) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.job_id) {
      return NextResponse.json({ error: "job_id is required." }, { status: 400 });
    }

    // Check for duplicate application
    const dupCheck = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[job_id][_eq]=${body.job_id}&filter[user_id][_eq]=${userId}&fields=application_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (dupCheck.ok) {
      const dupJson = await dupCheck.json();
      if ((dupJson.data ?? []).length > 0) {
        return NextResponse.json(
          { error: "You have already applied to this job." },
          { status: 409 }
        );
      }
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const payload = {
      job_id: Number(body.job_id),
      user_id: userId,
      application_status: "APPLIED",
      cover_letter: body.cover_letter?.trim() || null,
      expected_salary: body.expected_salary ? Number(body.expected_salary) : null,
      portfolio_url: body.portfolio_url?.trim() || null,
      screening_answers: body.screening_answers ?? null,
      applied_at: nowPH,
    };

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_application`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to submit application." },
        { status: res.status }
      );
    }

    // Trigger notification
    await createNotification({
      event_type: "application_submitted",
      recipient_user_id: userId,
      entity_type: "job_application",
      entity_id: json.data?.application_id,
      category: "Application Updates",
      title: "Application Submitted!",
      message: "Your application has been received. We will notify you of any updates.",
      action_url: "/vos-sync/freelancer/applications",
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully.",
      application: json.data,
    });
  } catch (err: unknown) {
    console.error("POST /api/freelancer/applications error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
