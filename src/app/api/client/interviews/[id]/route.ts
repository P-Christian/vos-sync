// src/app/api/client/interviews/[id]/route.ts
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

const VALID_STATUSES = ["CONFIRMED", "CANCELLED", "RESCHEDULED", "COMPLETED", "NO_SHOW"];

// PATCH — Update interview status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body?.interview_status) {
      return NextResponse.json(
        { error: "interview_status is required." },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(body.interview_status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const updatePayload: Record<string, unknown> = {
      interview_status: body.interview_status,
      status_updated_at: nowPH,
    };

    if (body.interview_notes) updatePayload.interview_notes = body.interview_notes;
    if (body.interview_date) updatePayload.interview_date = body.interview_date;
    if (body.interview_time) updatePayload.interview_time = body.interview_time;
    if (body.meeting_link) updatePayload.meeting_link = body.meeting_link;
    if (body.meeting_location) updatePayload.meeting_location = body.meeting_location;

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_interview/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updatePayload),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: json.errors?.[0]?.message ?? "Failed to update interview." },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Interview status updated to ${body.interview_status}.`,
      interview: json.data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
