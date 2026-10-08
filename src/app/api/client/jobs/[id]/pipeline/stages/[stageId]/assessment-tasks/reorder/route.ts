// src/app/api/client/jobs/[id]/pipeline/stages/[stageId]/assessment-tasks/reorder/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isClientSession,
} from "@/lib/authenticated-session";
import {
  getJobAssessmentStage,
  reorderJobAssessmentTasks,
} from "@/modules/client/pipeline/services/job-assessment-task.service";
import {
  canModifyJobPipeline,
  getJobCompanyId,
} from "@/modules/client/pipeline/services/job-pipeline.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

async function resolveClientCompany(
  userId: string | number
): Promise<number | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${String(userId)}&fields=company_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const json = (await res.json()) as {
      data?: Array<{ company_id?: number | string }>;
    };
    const raw = json.data?.[0]?.company_id ?? null;
    if (raw === null || raw === undefined) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  const session = await authenticateRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isClientSession(session))
    return NextResponse.json(
      { error: "Client account required." },
      { status: 403 }
    );

  const companyId = await resolveClientCompany(session.userId);
  if (!companyId)
    return NextResponse.json(
      { error: "Company association not found." },
      { status: 404 }
    );

  try {
    const { id, stageId } = await params;
    const jobId = Number(id);
    const sId = Number(stageId);
    if (!Number.isSafeInteger(jobId) || !Number.isSafeInteger(sId)) {
      return NextResponse.json(
        { error: "Invalid job or stage id." },
        { status: 400 }
      );
    }

    const jobCompanyId = await getJobCompanyId(jobId);
    if (!jobCompanyId) {
      return NextResponse.json(
        { error: "Job posting not found." },
        { status: 404 }
      );
    }
    if (jobCompanyId !== companyId) {
      return NextResponse.json(
        { error: "Forbidden: job belongs to another organization." },
        { status: 403 }
      );
    }

    const stage = await getJobAssessmentStage(jobId, sId);
    if (!stage.ok) {
      if (stage.error === "STAGE_NOT_ASSESSMENT") {
        return NextResponse.json(
          { error: "Assessment tasks can only be managed on ASSESSMENT stages." },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: "Job pipeline stage not found." },
        { status: 404 }
      );
    }

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

    const body: unknown = await req.json().catch(() => null);
    const orderedRaw = isRecord(body) ? body.ordered_task_ids : undefined;
    if (!Array.isArray(orderedRaw)) {
      return NextResponse.json(
        { error: "ordered_task_ids array is required." },
        { status: 400 }
      );
    }
    const orderedIds = orderedRaw.map(Number);
    if (
      orderedIds.some((taskId) => !Number.isSafeInteger(taskId) || taskId <= 0)
    ) {
      return NextResponse.json(
        { error: "ordered_task_ids must contain valid task ids." },
        { status: 400 }
      );
    }

    const result = await reorderJobAssessmentTasks(jobId, sId, orderedIds);
    if (!result.ok) {
      if (result.error === "STAGE_NOT_ASSESSMENT") {
        return NextResponse.json(
          { error: "Assessment tasks can only be managed on ASSESSMENT stages." },
          { status: 422 }
        );
      }
      if (
        result.error === "VERSION_NOT_FOUND" ||
        result.error === "STAGE_NOT_FOUND"
      ) {
        return NextResponse.json(
          { error: "Job pipeline stage not found." },
          { status: 404 }
        );
      }
      if (result.error === "ORDER_MISMATCH") {
        return NextResponse.json(
          {
            error:
              "ordered_task_ids must cover exactly the stage's tasks with no duplicates.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to reorder assessment tasks." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, tasks: result.data });
  } catch (err) {
    console.error("PUT job assessment-tasks/reorder error:", err);
    return NextResponse.json(
      { error: "Failed to reorder assessment tasks." },
      { status: 500 }
    );
  }
}
