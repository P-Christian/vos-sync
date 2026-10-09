// Read-only assembly of the employer assessment-review view: all attempts
// for the application's current ASSESSMENT stage (newest first) with each
// attempt's responses, plus frozen employer task definitions.

import {
  toAttemptDTO,
  type AssessmentAttemptDTO,
  type AssessmentTaskType,
} from "@/modules/shared/assessment";
import type {
  ActiveReviewContext,
  AssessmentHistoryContext,
  EmployerTaskView,
} from "./context";
import { directusList } from "./directus";

const ATTEMPT_FIELDS = [
  "id",
  "application_id",
  "job_stage_id",
  "attempt_number",
  "predecessor_attempt_id",
  "status",
  "submitted_at",
  "reviewed_at",
  "reviewed_by",
  "review_notes",
].join(",");

const RESPONSE_FIELDS = [
  "id",
  "attempt_id",
  "job_task_id",
  "selected_choice_key",
  "response_text",
  "proof_file_id",
  "proof_file_name",
].join(",");

export interface ReviewResponseView {
  job_task_id: number;
  task_type: AssessmentTaskType;
  selected_choice_key: string | null;
  response_text: string | null;
  proof_file_id: string | null;
  proof_file_name: string | null;
}

export interface ReviewAttemptView {
  attempt: AssessmentAttemptDTO;
  responses: ReviewResponseView[];
}

export interface AssessmentReviewModel {
  application_id: number;
  stage_id: number;
  tasks: EmployerTaskView[];
  attempts: ReviewAttemptView[];
}

export interface StageHistoryView {
  stage_id: number;
  stage_name: string;
  tasks: EmployerTaskView[];
  attempts: ReviewAttemptView[];
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function taskTypeFor(taskViews: EmployerTaskView[], jobTaskId: number): AssessmentTaskType | null {
  const found = taskViews.find((entry) => entry.job_task_id === jobTaskId);
  return found ? found.task.task_type : null;
}

export async function readAssessmentReview(
  context: ActiveReviewContext,
): Promise<AssessmentReviewModel> {
  const attempts = await loadAttemptsForStage(
    context.application.application_id,
    context.stageId,
    context.tasks,
  );
  return {
    application_id: context.application.application_id,
    stage_id: context.stageId,
    tasks: context.tasks,
    attempts,
  };
}

export async function readStageHistories(
  history: AssessmentHistoryContext,
  applicationId: number,
): Promise<StageHistoryView[]> {
  const views: StageHistoryView[] = [];
  for (const stage of history.stages) {
    const attempts = await loadAttemptsForStage(applicationId, stage.stageId, stage.tasks);
    if (attempts.length === 0) continue;
    views.push({
      stage_id: stage.stageId,
      stage_name: stage.stageName,
      tasks: stage.tasks,
      attempts,
    });
  }
  return views;
}

async function loadAttemptsForStage(
  applicationId: number,
  stageId: number,
  taskViews: EmployerTaskView[],
): Promise<ReviewAttemptView[]> {
  const attemptParams = new URLSearchParams({
    "filter[application_id][_eq]": String(applicationId),
    "filter[job_stage_id][_eq]": String(stageId),
    fields: ATTEMPT_FIELDS,
    "sort[]": "-attempt_number",
    limit: "-1",
  });
  const attemptRows = await directusList(
    "vs_application_assessment_attempts",
    attemptParams,
  );
  const attempts: ReviewAttemptView[] = [];
  for (const raw of attemptRows) {
    const id = Number(raw.id);
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    if (typeof raw.status !== "string") continue;
    const responseParams = new URLSearchParams({
      "filter[attempt_id][_eq]": String(id),
      fields: RESPONSE_FIELDS,
      limit: "-1",
    });
    const responseRows = await directusList(
      "vs_application_assessment_responses",
      responseParams,
    );
    const responses: ReviewResponseView[] = [];
    for (const row of responseRows) {
      const jobTaskId = Number(row.job_task_id);
      if (!Number.isSafeInteger(jobTaskId)) continue;
      const taskType = taskTypeFor(taskViews, jobTaskId);
      if (!taskType) continue;
      responses.push({
        job_task_id: jobTaskId,
        task_type: taskType,
        selected_choice_key: asNullableString(row.selected_choice_key),
        response_text: asNullableString(row.response_text),
        proof_file_id: asNullableString(row.proof_file_id),
        proof_file_name: asNullableString(row.proof_file_name),
      });
    }
    attempts.push({
      attempt: toAttemptDTO({
        id,
        application_id: Number(raw.application_id),
        job_stage_id: Number(raw.job_stage_id),
        attempt_number: Number(raw.attempt_number),
        predecessor_attempt_id: asNullableNumber(raw.predecessor_attempt_id),
        status: raw.status as AssessmentAttemptDTO["status"],
        submitted_at: asNullableString(raw.submitted_at),
        reviewed_at: asNullableString(raw.reviewed_at),
        reviewed_by: asNullableNumber(raw.reviewed_by),
        review_notes: asNullableString(raw.review_notes),
      }),
      responses,
    });
  }
  return attempts;
}
