// src/app/api/client/jobs/[id]/pipeline/stages/[stageId]/assessment-tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isClientSession,
} from "@/lib/authenticated-session";
import { createTaskInputSchema } from "@/modules/shared/assessment";
import {
  createJobAssessmentTask,
  getJobAssessmentStage,
  listJobAssessmentTasks,
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

interface RouteParams {
  params: Promise<{ id: string; stageId: string }>;
}

async function resolveJobStage(
  jobId: number,
  stageId: number,
  companyId: number
): Promise<NextResponse | null> {
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
  const stage = await getJobAssessmentStage(jobId, stageId);
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
  return null;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const rejection = await resolveJobStage(jobId, sId, companyId);
    if (rejection) return rejection;

    const result = await listJobAssessmentTasks(jobId, sId);
    if (!result.ok) {
      if (result.error === "STAGE_NOT_ASSESSMENT") {
        return NextResponse.json(
          { error: "Assessment tasks can only be managed on ASSESSMENT stages." },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: "Failed to load assessment tasks." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, tasks: result.data });
  } catch (err) {
    console.error("GET job assessment-tasks error:", err);
    return NextResponse.json(
      { error: "Failed to load assessment tasks." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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

    const rejection = await resolveJobStage(jobId, sId, companyId);
    if (rejection) return rejection;

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
    const parsed = createTaskInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid task payload.",
          details: parsed.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
          ),
        },
        { status: 400 }
      );
    }

    const result = await createJobAssessmentTask(jobId, sId, parsed.data);
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
      return NextResponse.json(
        { error: "Failed to create assessment task." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, task: result.data });
  } catch (err) {
    console.error("POST job assessment-tasks error:", err);
    return NextResponse.json(
      { error: "Failed to create assessment task." },
      { status: 500 }
    );
  }
}
