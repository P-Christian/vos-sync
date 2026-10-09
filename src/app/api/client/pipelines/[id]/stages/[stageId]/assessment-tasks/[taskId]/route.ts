// src/app/api/client/pipelines/[id]/stages/[stageId]/assessment-tasks/[taskId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isClientSession,
} from "@/lib/authenticated-session";
import { updateTaskInputSchema } from "@/modules/shared/assessment";
import {
  deleteCompanyAssessmentTask,
  getCompanyAssessmentStage,
  updateCompanyAssessmentTask,
} from "@/modules/client/pipeline/services/assessment-task.service";
import { resolveTaskRouteCompany } from "../task-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; stageId: string; taskId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await authenticateRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isClientSession(session))
    return NextResponse.json(
      { error: "Client account required." },
      { status: 403 }
    );

  const companyId = await resolveTaskRouteCompany(session.userId);
  if (!companyId)
    return NextResponse.json(
      { error: "Company association not found." },
      { status: 404 }
    );

  try {
    const { id, stageId, taskId } = await params;
    const pipelineId = Number(id);
    const sId = Number(stageId);
    const tId = Number(taskId);
    if (
      !Number.isSafeInteger(pipelineId) ||
      !Number.isSafeInteger(sId) ||
      !Number.isSafeInteger(tId)
    ) {
      return NextResponse.json(
        { error: "Invalid pipeline, stage, or task id." },
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
    const parsed = updateTaskInputSchema.safeParse(body);
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

    const result = await updateCompanyAssessmentTask(
      pipelineId,
      sId,
      tId,
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
      if (result.error === "TASK_NOT_FOUND") {
        return NextResponse.json(
          { error: "Assessment task not found." },
          { status: 404 }
        );
      }
      if (result.error === "TASK_TYPE_MISMATCH") {
        return NextResponse.json(
          { error: "Task type cannot be changed after creation." },
          { status: 400 }
        );
      }
      if (result.error === "INVALID_INPUT") {
        return NextResponse.json(
          { error: "Invalid task payload.", details: result.details },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update assessment task." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, task: result.data });
  } catch (err) {
    console.error("PATCH assessment-tasks/[taskId] error:", err);
    return NextResponse.json(
      { error: "Failed to update assessment task." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await authenticateRequest(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isClientSession(session))
    return NextResponse.json(
      { error: "Client account required." },
      { status: 403 }
    );

  const companyId = await resolveTaskRouteCompany(session.userId);
  if (!companyId)
    return NextResponse.json(
      { error: "Company association not found." },
      { status: 404 }
    );

  try {
    const { id, stageId, taskId } = await params;
    const pipelineId = Number(id);
    const sId = Number(stageId);
    const tId = Number(taskId);
    if (
      !Number.isSafeInteger(pipelineId) ||
      !Number.isSafeInteger(sId) ||
      !Number.isSafeInteger(tId)
    ) {
      return NextResponse.json(
        { error: "Invalid pipeline, stage, or task id." },
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

    const result = await deleteCompanyAssessmentTask(
      pipelineId,
      sId,
      tId,
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
      if (
        result.error === "PIPELINE_NOT_FOUND" ||
        result.error === "STAGE_NOT_FOUND"
      ) {
        return NextResponse.json(
          { error: "Pipeline or stage not found." },
          { status: 404 }
        );
      }
      if (result.error === "TASK_NOT_FOUND") {
        return NextResponse.json(
          { error: "Assessment task not found." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to delete assessment task." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE assessment-tasks/[taskId] error:", err);
    return NextResponse.json(
      { error: "Failed to delete assessment task." },
      { status: 500 }
    );
  }
}
