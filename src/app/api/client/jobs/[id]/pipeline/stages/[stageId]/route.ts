import { NextRequest, NextResponse } from "next/server";
import {
  canModifyJobPipeline,
  deleteJobPipelineStage,
  getJobCompanyId,
  updateJobPipelineStage,
} from "@/modules/client/pipeline/services/job-pipeline.service";
import { authenticateRequest } from "@/lib/authenticated-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const ALLOWED_COLORS = new Set(["sky", "blue", "indigo", "purple", "violet", "amber", "emerald", "rose", "zinc"]);

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

async function getCompanyId(userId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const json = await res.json();
    return json.data?.[0]?.company_id ?? null;
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { id, stageId } = await params;
    const jobId = Number(id);
    const sId = Number(stageId);
    if (!jobId || isNaN(jobId) || !sId || isNaN(sId)) {
      return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
    }

    const session = await authenticateRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = Number(session.userId);
    const companyId = await getCompanyId(userId);
    if (!companyId) {
      return NextResponse.json({ error: "Company association not found." }, { status: 404 });
    }

    const jobCompanyId = await getJobCompanyId(jobId);
    if (!jobCompanyId) {
      return NextResponse.json({ error: "Job posting not found." }, { status: 404 });
    }
    if (jobCompanyId !== companyId) {
      return NextResponse.json(
        { error: "Forbidden: job belongs to another organization." },
        { status: 403 }
      );
    }

    // Backend Immutability Gate
    const lockCheck = await canModifyJobPipeline(jobId);
    if (!lockCheck.canModify) {
      return NextResponse.json(
        {
          error: lockCheck.error || "Cannot modify pipeline because applications exist.",
          application_count: lockCheck.applicationCount,
        },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Request payload required." }, { status: 400 });

    let stageName = body.stage_name !== undefined ? String(body.stage_name).trim() : undefined;
    if (stageName !== undefined) {
      if (!stageName) return NextResponse.json({ error: "Stage name cannot be empty." }, { status: 400 });
      if (stageName.length > 100) return NextResponse.json({ error: "Stage name cannot exceed 100 characters." }, { status: 400 });
    }

    let color = body.color !== undefined ? String(body.color).trim() : undefined;
    if (color !== undefined && !ALLOWED_COLORS.has(color)) {
      return NextResponse.json({ error: "Invalid color key." }, { status: 400 });
    }

    let description = body.description !== undefined ? String(body.description).trim().slice(0, 500) : undefined;
    let stageOrder = body.stage_order !== undefined && Number.isInteger(Number(body.stage_order)) && Number(body.stage_order) > 0 ? Number(body.stage_order) : undefined;

    const result = await updateJobPipelineStage(jobId, sId, {
      stage_name: stageName,
      color,
      description,
      stage_order: stageOrder,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update stage." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/client/jobs/[id]/pipeline/stages/[stageId] error:", err);
    return NextResponse.json(
      { error: "Failed to update stage." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { id, stageId } = await params;
    const jobId = Number(id);
    const sId = Number(stageId);
    if (!jobId || isNaN(jobId) || !sId || isNaN(sId)) {
      return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
    }

    const session = await authenticateRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const userId = Number(session.userId);
    const companyId = await getCompanyId(userId);
    if (!companyId) {
      return NextResponse.json({ error: "Company association not found." }, { status: 404 });
    }

    const jobCompanyId = await getJobCompanyId(jobId);
    if (!jobCompanyId) {
      return NextResponse.json({ error: "Job posting not found." }, { status: 404 });
    }
    if (jobCompanyId !== companyId) {
      return NextResponse.json(
        { error: "Forbidden: job belongs to another organization." },
        { status: 403 }
      );
    }

    // Backend Immutability Gate
    const lockCheck = await canModifyJobPipeline(jobId);
    if (!lockCheck.canModify) {
      return NextResponse.json(
        {
          error: lockCheck.error || "Cannot modify pipeline because applications exist.",
          application_count: lockCheck.applicationCount,
        },
        { status: 409 }
      );
    }

    const result = await deleteJobPipelineStage(jobId, sId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete stage." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/client/jobs/[id]/pipeline/stages/[stageId] error:", err);
    return NextResponse.json(
      { error: "Failed to delete stage." },
      { status: 500 }
    );
  }
}
