// src/modules/client/pipeline/services/job-assessment-task.store.ts
// Directus access layer for job assessment tasks: connection helpers,
// row contracts, payload mapping, and active-pipeline stage resolution.
// Every write targets vs_job_pipeline_assessment_tasks; company templates
// are read-only here and only via fetchStageTasks.

import {
  type AssessmentChoiceOption,
  type AssessmentTaskType,
  type CreateTaskInput,
} from "@/modules/shared/assessment";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

const JOB_TASK_COLLECTION = "vs_job_pipeline_assessment_tasks";

export interface JobAssessmentTaskRow {
  id: number;
  job_stage_id: number;
  source_company_task_id: number | null;
  task_type: AssessmentTaskType;
  title: string;
  instructions: string | null;
  is_required: boolean;
  sort_order: number;
  choice_options: AssessmentChoiceOption[] | null;
  correct_choice_key: string | null;
  external_url: string | null;
  text_max_length: number | null;
  created_at?: string;
  updated_at?: string;
}

export type JobAssessmentTaskError =
  | "VERSION_NOT_FOUND"
  | "STAGE_NOT_FOUND"
  | "STAGE_NOT_ASSESSMENT"
  | "TASK_NOT_FOUND"
  | "TASK_TYPE_MISMATCH"
  | "INVALID_INPUT"
  | "ORDER_MISMATCH"
  | "DIRECTUS_ERROR";

export type JobAssessmentTaskResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: JobAssessmentTaskError; details?: string };

export interface JobAssessmentStageRef {
  id: number;
  job_pipeline_id: number;
  stage_type: string;
}

export function normalizeJobRow(
  raw: Record<string, unknown>
): JobAssessmentTaskRow {
  const choiceOptions = raw.choice_options;
  const sourceTask = raw.source_company_task_id;
  return {
    id: Number(raw.id),
    job_stage_id: Number(raw.job_stage_id),
    source_company_task_id:
      typeof sourceTask === "number" ? sourceTask : null,
    task_type: raw.task_type as AssessmentTaskType,
    title: String(raw.title ?? ""),
    instructions:
      typeof raw.instructions === "string" ? raw.instructions : null,
    is_required: Boolean(raw.is_required),
    sort_order: Number(raw.sort_order ?? 0),
    choice_options: Array.isArray(choiceOptions)
      ? (choiceOptions as AssessmentChoiceOption[])
      : null,
    correct_choice_key:
      typeof raw.correct_choice_key === "string"
        ? raw.correct_choice_key
        : null,
    external_url:
      typeof raw.external_url === "string" ? raw.external_url : null,
    text_max_length:
      typeof raw.text_max_length === "number" ? raw.text_max_length : null,
    created_at:
      typeof raw.created_at === "string" ? raw.created_at : undefined,
    updated_at:
      typeof raw.updated_at === "string" ? raw.updated_at : undefined,
  };
}

export function toJobTaskPayload(
  input: CreateTaskInput,
  jobStageId: number,
  sourceCompanyTaskId: number | null,
  sortOrder: number,
  nowUtc: string
): Record<string, unknown> {
  const base = {
    job_stage_id: jobStageId,
    source_company_task_id: sourceCompanyTaskId,
    title: input.title,
    instructions: input.instructions ?? null,
    is_required: input.is_required,
    sort_order: sortOrder,
    created_at: nowUtc,
    updated_at: nowUtc,
  };
  switch (input.task_type) {
    case "SINGLE_CHOICE":
      return { ...base, task_type: "SINGLE_CHOICE", choice_options: input.choice_options, correct_choice_key: input.correct_choice_key, external_url: null, text_max_length: null };
    case "EXTERNAL_TASK":
      return { ...base, task_type: "EXTERNAL_TASK", choice_options: null, correct_choice_key: null, external_url: input.external_url, text_max_length: null };
    case "FILE_UPLOAD":
      return { ...base, task_type: "FILE_UPLOAD", choice_options: null, correct_choice_key: null, external_url: null, text_max_length: null };
    case "TEXT_RESPONSE":
      return { ...base, task_type: "TEXT_RESPONSE", choice_options: null, correct_choice_key: null, external_url: null, text_max_length: input.text_max_length };
  }
}

export async function fetchJobTasks(jobStageId: number): Promise<JobAssessmentTaskRow[]> {
  const res = await fetch(
    `${DIRECTUS_BASE}/items/${JOB_TASK_COLLECTION}?filter[job_stage_id][_eq]=${jobStageId}&sort=sort_order&limit=-1`,
    { headers: getHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Directus job task list failed: ${res.status}`);
  const json = (await res.json()) as { data?: Record<string, unknown>[] };
  return (json.data ?? []).map(normalizeJobRow);
}

export async function jobTaskCollection(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${DIRECTUS_BASE}/items/${JOB_TASK_COLLECTION}${path}`, {
    ...init,
    headers: getHeaders(),
  });
}

/**
 * Resolves a job pipeline stage owned by the job's ACTIVE pipeline version.
 * Returns STAGE_NOT_FOUND when the stage id belongs to another pipeline.
 */
export async function getJobAssessmentStage(
  jobId: number,
  stageId: number
): Promise<JobAssessmentTaskResult<{ pipelineId: number; stage: JobAssessmentStageRef }>> {
  try {
    const verRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_versions?filter[job_id][_eq]=${jobId}&filter[is_active][_eq]=true&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!verRes.ok) return { ok: false, error: "DIRECTUS_ERROR" };
    const verJson = (await verRes.json()) as { data?: Array<{ id?: unknown }> };
    const versionId = Number(verJson.data?.[0]?.id);
    if (!Number.isSafeInteger(versionId) || versionId <= 0) {
      return { ok: false, error: "VERSION_NOT_FOUND" };
    }
    const stRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_stages/${stageId}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!stRes.ok) return { ok: false, error: "STAGE_NOT_FOUND" };
    const stJson = (await stRes.json()) as { data?: Record<string, unknown> };
    const raw = stJson.data;
    if (!raw || Number(raw.job_pipeline_id) !== versionId) {
      return { ok: false, error: "STAGE_NOT_FOUND" };
    }
    if (raw.stage_type !== "ASSESSMENT") {
      return { ok: false, error: "STAGE_NOT_ASSESSMENT" };
    }
    return {
      ok: true,
      data: {
        pipelineId: versionId,
        stage: { id: Number(raw.id), job_pipeline_id: versionId, stage_type: String(raw.stage_type) },
      },
    };
  } catch (error) {
    console.error("[job-assessment-task.service] getJobAssessmentStage error:", error);
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}
