// Draft persistence for freelancer assessment responses.
// Creates attempt 1 when none exists; otherwise requires IN_PROGRESS via the
// shared state machine. Unknown/cross-stage task ids are rejected with 422.

import {
  applyAttemptAction,
  validateTaskResponse,
  type AssessmentAttemptDTO,
  type TaskResponseValidation,
} from "@/modules/shared/assessment";
import { toAttemptDTO } from "@/modules/shared/assessment";
import type { ActiveAssessmentContext } from "./context";
import { asValidatableTask } from "./snapshot";
import {
  createFirstAttempt,
  loadLatestAttempt,
  upsertResponseRow,
  type AttemptRow,
  type ResponseColumns,
} from "./store";

export interface DraftIssue {
  job_task_id: number | null;
  message: string;
}

export type DraftResult =
  | { ok: true; attempt: AssessmentAttemptDTO; saved: number }
  | { ok: false; status: 400 | 409 | 422 | 502; error: string; issues?: DraftIssue[] };

const MAX_DRAFT_RESPONSES = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJobTaskId(value: unknown): number | null {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : Number(value);
  if (typeof value === "boolean" || value === null || value === undefined) return null;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function errorOf(validation: TaskResponseValidation): string {
  const issues = validation.error?.issues ?? [];
  return (
    issues
      .map((issue) => `${issue.path.map(String).join(".") || "value"}: ${issue.message}`)
      .join("; ") || "Invalid response."
  );
}

/** Builds the exact strict-schema input for one task type (no extra keys). */
function buildDraftInput(
  taskType: string,
  item: Record<string, unknown>,
): Record<string, unknown> {
  const input: Record<string, unknown> = { task_type: taskType };
  if (taskType === "SINGLE_CHOICE") {
    if (item.selected_choice_key !== undefined) input.selected_choice_key = item.selected_choice_key;
    return input;
  }
  if (taskType === "TEXT_RESPONSE" || taskType === "EXTERNAL_TASK") {
    if (item.response_text !== undefined) input.response_text = item.response_text;
    return input;
  }
  if (item.proof_file_id !== undefined) input.proof_file_id = item.proof_file_id;
  if (item.proof_file_name !== undefined) input.proof_file_name = item.proof_file_name;
  return input;
}

/** Maps validated draft data to response columns (defined fields only). */
function toColumns(taskType: string, data: Record<string, unknown>): ResponseColumns {
  const columns: ResponseColumns = {};
  if (taskType === "SINGLE_CHOICE" && data.selected_choice_key !== undefined) {
    columns.selected_choice_key = data.selected_choice_key as string;
  }
  if ((taskType === "TEXT_RESPONSE" || taskType === "EXTERNAL_TASK") && data.response_text !== undefined) {
    columns.response_text = data.response_text as string;
  }
  if (taskType === "FILE_UPLOAD") {
    if (data.proof_file_id !== undefined) columns.proof_file_id = data.proof_file_id as string;
    if (data.proof_file_name !== undefined) {
      columns.proof_file_name = (data.proof_file_name as string | null) ?? null;
    }
  }
  return columns;
}

export async function saveDraftResponses(
  context: ActiveAssessmentContext,
  body: unknown,
): Promise<DraftResult> {
  const items = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.responses) ? body.responses : null;
  if (!items || items.length === 0) {
    return { ok: false, status: 400, error: "A non-empty response list is required." };
  }
  if (items.length > MAX_DRAFT_RESPONSES) {
    return { ok: false, status: 422, error: "A maximum of 100 responses is allowed per draft save." };
  }

  const validated: Array<{ jobTaskId: number; taskType: string; data: Record<string, unknown> }> = [];
  const issues: DraftIssue[] = [];
  for (const entry of items) {
    if (!isRecord(entry)) {
      issues.push({ job_task_id: null, message: "Each response must be an object." });
      continue;
    }
    const jobTaskId = parseJobTaskId(entry.job_task_id);
    const snapshot = jobTaskId === null ? undefined : context.taskById.get(jobTaskId);
    if (jobTaskId === null || !snapshot) {
      issues.push({ job_task_id: jobTaskId, message: "Unknown job_task_id for this assessment stage." });
      continue;
    }
    if (entry.task_type !== undefined && entry.task_type !== snapshot.task_type) {
      issues.push({ job_task_id: jobTaskId, message: "task_type does not match the frozen task." });
      continue;
    }
    const result = validateTaskResponse(
      asValidatableTask(snapshot),
      buildDraftInput(snapshot.task_type, entry),
      "draft",
    );
    if (!result.success) {
      issues.push({ job_task_id: jobTaskId, message: errorOf(result) });
      continue;
    }
    validated.push({
      jobTaskId,
      taskType: snapshot.task_type,
      data: result.data as Record<string, unknown>,
    });
  }
  if (issues.length > 0) {
    return { ok: false, status: 422, error: "One or more responses are invalid.", issues };
  }

  let attempt: AttemptRow | null = await loadLatestAttempt(
    context.application.application_id,
    context.stageId,
  );
  if (!attempt) {
    attempt = await createFirstAttempt(context.application.application_id, context.stageId);
    if (!attempt) {
      return { ok: false, status: 502, error: "Could not start the assessment attempt." };
    }
  } else {
    try {
      applyAttemptAction(attempt.status, "SAVE_DRAFT");
    } catch {
      return { ok: false, status: 409, error: `Draft cannot be saved when the attempt is ${attempt.status}.` };
    }
  }

  let saved = 0;
  for (const item of validated) {
    const row = await upsertResponseRow(attempt.id, item.jobTaskId, toColumns(item.taskType, item.data));
    if (!row) {
      return { ok: false, status: 502, error: "Could not save a draft response." };
    }
    saved += 1;
  }
  return { ok: true, attempt: toAttemptDTO(attempt), saved };
}
