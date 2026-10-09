// src/app/api/client/pipelines/[id]/stages/[stageId]/assessment-tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isClientSession,
} from "@/lib/authenticated-session";
import { createTaskInputSchema } from "@/modules/shared/assessment";
import {
  createCompanyAssessmentTask,
  getCompanyAssessmentStage,
  listCompanyAssessmentTasks,
} from "@/modules/client/pipeline/services/assessment-task.service";

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
    const pipelineId = Number(id);
    const sId = Number(stageId);
    if (!Number.isSafeInteger(pipelineId) || !Number.isSafeInteger(sId)) {
      return NextResponse.json(
        { error: "Invalid pipeline or stage id." },
        { status: 400 }
      );
    }

    const stage = await getCompanyAssessmentStage(
      pipelineId,
      sId,
      companyId
    );
    if (!stage)
      return NextResponse.json(
        { error: "Pipeline or stage not found." },
        { status: 404 }
      );
    if (stage.stage_type !== "ASSESSMENT") {
      return NextResponse.json(
        { error: "Assessment tasks can only be managed on ASSESSMENT stages." },
        { status: 422 }
      );
    }

    const result = await listCompanyAssessmentTasks(
      pipelineId,
      sId,
      companyId
    );
    if (!result.ok) {
      if (result.error === "STAGE_NOT_ASSESSMENT") {
        return NextResponse.json(
          {
            error:
              "Assessment tasks can only be managed on ASSESSMENT stages.",
          },
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
    console.error("GET assessment-tasks error:", err);
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
    const pipelineId = Number(id);
    const sId = Number(stageId);
    if (!Number.isSafeInteger(pipelineId) || !Number.isSafeInteger(sId)) {
      return NextResponse.json(
        { error: "Invalid pipeline or stage id." },
        { status: 400 }
      );
    }

    const stage = await getCompanyAssessmentStage(
      pipelineId,
      sId,
      companyId
    );
    if (!stage)
      return NextResponse.json(
        { error: "Pipeline or stage not found." },
        { status: 404 }
      );
    if (stage.stage_type !== "ASSESSMENT") {
      return NextResponse.json(
        { error: "Assessment tasks can only be managed on ASSESSMENT stages." },
        { status: 422 }
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

    const result = await createCompanyAssessmentTask(
      pipelineId,
      sId,
      companyId,
      parsed.data
    );
    if (!result.ok) {
      if (result.error === "STAGE_NOT_ASSESSMENT") {
        return NextResponse.json(
          {
            error:
              "Assessment tasks can only be managed on ASSESSMENT stages.",
          },
          { status: 422 }
        );
      }
      if (
        result.error === "PIPELINE_NOT_FOUND" ||
        result.error === "STAGE_NOT_FOUND"
      ) {
        return NextResponse.json(
          { error: "Pipeline or stage not found." },
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
    console.error("POST assessment-tasks error:", err);
    return NextResponse.json(
      { error: "Failed to create assessment task." },
      { status: 500 }
    );
  }
}
