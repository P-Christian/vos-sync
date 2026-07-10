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
      `${DIRECTUS_BASE}/items/vs_job_posting?filter[company_id][_eq]=${companyId}&fields=job_id&limit=500`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const jobsJson = await jobsRes.json();
    const jobIds: number[] = (jobsJson.data ?? []).map(
      (j: { job_id: number }) => j.job_id
    );

    if (jobIds.length === 0) {
      return NextResponse.json({ applicants: [] });
    }

    let filterQuery = `filter[job_id][_in]=${jobIds.join(",")}`;
    if (status && status !== "ALL") filterQuery += `&filter[application_status][_eq]=${status}`;
    if (jobId) filterQuery += `&filter[job_id][_eq]=${jobId}`;

    const appRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_application?${filterQuery}&sort[]=-applied_at&fields=*&limit=200`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const appJson = await appRes.json();

    return NextResponse.json({ applicants: appJson.data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

