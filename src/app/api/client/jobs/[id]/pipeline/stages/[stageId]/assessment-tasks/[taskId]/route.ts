// src/app/api/client/jobs/[id]/pipeline/stages/[stageId]/assessment-tasks/[taskId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isClientSession,
} from "@/lib/authenticated-session";
import { updateTaskInputSchema } from "@/modules/shared/assessment";
import {
  deleteJobAssessmentTask,
  getJobAssessmentStage,
  updateJobAssessmentTask,
} from "@/modules/client/pipeline/services/job-assessment-task.service";
import {
  canModifyJobPipeline,
  getJobCompanyId,
} from "@/modules/client/pipeline/services/job-pipeline.service";
import { resolveJobTaskClientCompany } from "../job-task-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; stageId: string; taskId: string }>;
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

async function checkJobLock(jobId: number): Promise<NextResponse | null> {
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
  return null;
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

  const companyId = await resolveJobTaskClientCompany(session.userId);
  if (!companyId)
    return NextResponse.json(
      { error: "Company association not found." },
      { status: 404 }
    );

  try {
    const { id, stageId, taskId } = await params;
    const jobId = Number(id);
    const sId = Number(stageId);
    const tId = Number(taskId);
    if (
      !Number.isSafeInteger(jobId) ||
      !Number.isSafeInteger(sId) ||
      !Number.isSafeInteger(tId)
    ) {
      return NextResponse.json(
        { error: "Invalid job, stage, or task id." },
        { status: 400 }
      );
    }

    const rejection = await resolveJobStage(jobId, sId, companyId);
    if (rejection) return rejection;

    const locked = await checkJobLock(jobId);
    if (locked) return locked;

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

    const result = await updateJobAssessmentTask(jobId, sId, tId, parsed.data);
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
    console.error("PATCH job assessment-tasks/[taskId] error:", err);
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

  const companyId = await resolveJobTaskClientCompany(session.userId);
  if (!companyId)
    return NextResponse.json(
      { error: "Company association not found." },
      { status: 404 }
    );

  try {
    const { id, stageId, taskId } = await params;
    const jobId = Number(id);
    const sId = Number(stageId);
    const tId = Number(taskId);
    if (
      !Number.isSafeInteger(jobId) ||
      !Number.isSafeInteger(sId) ||
      !Number.isSafeInteger(tId)
    ) {
      return NextResponse.json(
        { error: "Invalid job, stage, or task id." },
        { status: 400 }
      );
    }

    const rejection = await resolveJobStage(jobId, sId, companyId);
    if (rejection) return rejection;

    const locked = await checkJobLock(jobId);
    if (locked) return locked;

    const result = await deleteJobAssessmentTask(jobId, sId, tId);
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
    console.error("DELETE job assessment-tasks/[taskId] error:", err);
    return NextResponse.json(
      { error: "Failed to delete assessment task." },
      { status: 500 }
    );
  }
}
