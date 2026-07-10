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

    return NextResponse.json({ interviews: json.data ?? [] });
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
    await fetch(`${DIRECTUS_BASE}/items/vs_application/${body.application_id}`, {
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

