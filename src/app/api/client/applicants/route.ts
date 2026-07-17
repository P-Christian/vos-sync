// src/app/api/client/applicants/route.ts
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

interface RawApplication {
  application_id: number;
  job_id: number;
  user_id: number;
  application_status: string;
  client_notes?: string | null;
  applied_at?: string;
  status_updated_at?: string;
}

interface DirectusUser {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_position?: string | null;
}

interface DirectusProfile {
  user_id: number;
  profile_headline?: string | null;
}

// GET — List all applicants for the company's jobs
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
    const jobId = searchParams.get("job_id");

    // Fetch job IDs belonging to this company first
    const jobsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting?filter[company_id][_eq]=${companyId}&fields=job_id,job_title&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const jobsJson = await jobsRes.json();
    const jobs: { job_id: number; job_title: string }[] = jobsJson.data ?? [];
    const jobIds = jobs.map((j) => j.job_id);

    if (jobIds.length === 0) {
      return NextResponse.json({ applicants: [] });
    }

    let filterQuery = `filter[job_id][_in]=${jobIds.join(",")}`;
    if (status && status !== "ALL") filterQuery += `&filter[application_status][_eq]=${status}`;
    if (jobId) filterQuery += `&filter[job_id][_eq]=${jobId}`;

    const appRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?${filterQuery}&sort[]=-applied_at&fields=*&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const appJson = await appRes.json();
    const rawApps: RawApplication[] = appJson.data ?? [];

    if (rawApps.length === 0) {
      return NextResponse.json({ applicants: [] });
    }

    // Resolve user details & profiles
    const userIds = [...new Set(rawApps.map((a) => a.user_id).filter(Boolean))];
    const usersMap: Record<number, { name: string; email: string; position?: string }> = {};
    const profilesMap: Record<number, string> = {};

    if (userIds.length > 0) {
      const usersRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname,user_email,user_position&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        const usersList: DirectusUser[] = usersJson.data ?? [];
        usersList.forEach((u) => {
          usersMap[u.user_id] = {
            name: `${u.user_fname} ${u.user_lname}`.trim(),
            email: u.user_email,
            position: u.user_position ?? undefined,
          };
        });
      }

      // Fetch headlines
      const profilesRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_job_seeker_profile?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,profile_headline&limit=200`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (profilesRes.ok) {
        const profilesJson = await profilesRes.json();
        const profilesList: DirectusProfile[] = profilesJson.data ?? [];
        profilesList.forEach((p) => {
          if (p.profile_headline) {
            profilesMap[p.user_id] = p.profile_headline;
          }
        });
      }
    }

    const jobsMap: Record<number, string> = {};
    jobs.forEach((j) => {
      jobsMap[j.job_id] = j.job_title;
    });

    const applicants = rawApps.map((a) => {
      const u = usersMap[a.user_id] ?? { name: `Applicant #${a.user_id}`, email: "" };
      const headline = profilesMap[a.user_id] ?? u.position ?? "N/A";
      return {
        ...a,
        applicant_name: u.name,
        applicant_email: u.email,
        job_title: jobsMap[a.job_id] ?? "Unknown Role",
        experience: headline,
      };
    });

    return NextResponse.json({ applicants });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
