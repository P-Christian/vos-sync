// src/app/api/client/jobs/[id]/route.ts
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

// GET — Fetch single job
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting/${id}?fields=*`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    if (!res.ok)
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Job not found." },
        { status: res.status }
      );
    return NextResponse.json({ job: json.data });
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

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(safePayload),
    });
    const json = await res.json();
    if (!res.ok)
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to update job." },
        { status: res.status }
      );
    return NextResponse.json({ success: true, job: json.data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — Soft-delete: set status = CLOSED and is_deleted = 1
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_posting/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status: "CLOSED", is_deleted: 1 }),
    });
    const json = await res.json();
    if (!res.ok)
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to close job." },
        { status: res.status }
      );
    return NextResponse.json({ success: true, message: "Job posting closed." });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
