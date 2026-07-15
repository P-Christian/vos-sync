// src/app/api/client/jobs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as jobService from "../service.directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — Fetch single job
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await jobService.getJob(id);
    return NextResponse.json({ job });
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

    return NextResponse.json({ success: true, job: updatedJob });
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
