// Directus store for assessment attempts and per-task responses.
// Assessment outcomes never touch vs_job_application: no status or stage
// movement happens here (stage movement is employer-driven).

import {
  PERSISTED_ATTEMPT_STATUSES,
  createInitialAttempt,
  type AssessmentAttempt,
  type PersistedAttemptStatus,
} from "@/modules/shared/assessment";
import { directusList, directusPatch, directusPost } from "./directus";

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

export type AttemptRow = AssessmentAttempt;

export interface ResponseRow {
  id: number;
  attempt_id: number;
  job_task_id: number;
  selected_choice_key: string | null;
  response_text: string | null;
  proof_file_id: string | null;
  proof_file_name: string | null;
}

function isPersistedStatus(value: unknown): value is PersistedAttemptStatus {
  return (
    typeof value === "string" &&
    (PERSISTED_ATTEMPT_STATUSES as readonly string[]).includes(value)
  );
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function normalizeAttemptRow(raw: Record<string, unknown>): AttemptRow | null {
  const id = Number(raw.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!isPersistedStatus(raw.status)) return null;
  return {
    id,
    application_id: Number(raw.application_id),
    job_stage_id: Number(raw.job_stage_id),
    attempt_number: Number(raw.attempt_number),
    predecessor_attempt_id: asNullableNumber(raw.predecessor_attempt_id),
    status: raw.status,
    submitted_at: asNullableString(raw.submitted_at),
    reviewed_at: asNullableString(raw.reviewed_at),
    reviewed_by: asNullableNumber(raw.reviewed_by),
    review_notes: asNullableString(raw.review_notes),
  };
}

export function normalizeResponseRow(raw: Record<string, unknown>): ResponseRow | null {
  const id = Number(raw.id);
  const attemptId = Number(raw.attempt_id);
  const jobTaskId = Number(raw.job_task_id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!Number.isSafeInteger(attemptId) || !Number.isSafeInteger(jobTaskId)) return null;
  return {
    id,
    attempt_id: attemptId,
    job_task_id: jobTaskId,
    selected_choice_key: asNullableString(raw.selected_choice_key),
    response_text: asNullableString(raw.response_text),
    proof_file_id: asNullableString(raw.proof_file_id),
    proof_file_name: asNullableString(raw.proof_file_name),
  };
}

/** Latest attempt for the application+stage pair (highest attempt_number). */
export async function loadLatestAttempt(
  applicationId: number,
  stageId: number,
): Promise<AttemptRow | null> {
  const params = new URLSearchParams({
    "filter[application_id][_eq]": String(applicationId),
    "filter[job_stage_id][_eq]": String(stageId),
    fields: ATTEMPT_FIELDS,
    "sort[]": "-attempt_number",
    limit: "1",
  });
  const rows = await directusList("vs_application_assessment_attempts", params);
  if (rows.length === 0) return null;
  return normalizeAttemptRow(rows[0]);
}

/** Creates attempt 1 in IN_PROGRESS via the shared state-machine constructor. */
export async function createFirstAttempt(
  applicationId: number,
  stageId: number,
): Promise<AttemptRow | null> {
  const created = await directusPost("vs_application_assessment_attempts", {
    application_id: applicationId,
    job_stage_id: stageId,
    attempt_number: 1,
    predecessor_attempt_id: null,
    status: "IN_PROGRESS",
    submitted_at: null,
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
  });
  if (!created.ok || !created.row) return null;
  const id = Number(created.row.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return createInitialAttempt({ id, application_id: applicationId, job_stage_id: stageId });
}

export async function persistAttemptSubmit(
  attemptId: number,
  status: PersistedAttemptStatus,
  submittedAt: string,
): Promise<boolean> {
  return directusPatch("vs_application_assessment_attempts", attemptId, {
    status,
    submitted_at: submittedAt,
  });
}

export async function loadResponseRows(attemptId: number): Promise<ResponseRow[]> {
  const params = new URLSearchParams({
    "filter[attempt_id][_eq]": String(attemptId),
    fields: RESPONSE_FIELDS,
    limit: "-1",
  });
  const rows = await directusList("vs_application_assessment_responses", params);
  const responses: ResponseRow[] = [];
  for (const raw of rows) {
    const row = normalizeResponseRow(raw);
    if (row) responses.push(row);
  }
  return responses;
}

export interface ResponseColumns {
  selected_choice_key?: string | null;
  response_text?: string | null;
  proof_file_id?: string | null;
  proof_file_name?: string | null;
}

/**
 * Upserts exactly one row per (attempt_id, job_task_id). Only the provided
 * columns are written, so sparse drafts can never wipe an uploaded proof.
 */
export async function upsertResponseRow(
  attemptId: number,
  jobTaskId: number,
  columns: ResponseColumns,
): Promise<ResponseRow | null> {
  const params = new URLSearchParams({
    "filter[attempt_id][_eq]": String(attemptId),
    "filter[job_task_id][_eq]": String(jobTaskId),
    fields: RESPONSE_FIELDS,
    limit: "1",
  });
  const existing = await directusList("vs_application_assessment_responses", params);
  const current = existing.length > 0 ? normalizeResponseRow(existing[0]) : null;
  if (current && Object.keys(columns).length === 0) return current;
  if (current) {
    const patched = await directusPatch(
      "vs_application_assessment_responses",
      current.id,
      { ...columns },
    );
    if (!patched) return null;
    return { ...current, ...columns };
  }
  const created = await directusPost("vs_application_assessment_responses", {
    attempt_id: attemptId,
    job_task_id: jobTaskId,
    selected_choice_key: columns.selected_choice_key ?? null,
    response_text: columns.response_text ?? null,
    proof_file_id: columns.proof_file_id ?? null,
    proof_file_name: columns.proof_file_name ?? null,
  });
  if (!created.ok || !created.row) return null;
  return normalizeResponseRow(created.row);
}
