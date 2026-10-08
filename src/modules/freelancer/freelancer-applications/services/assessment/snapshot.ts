// Frozen job-task snapshots for the freelancer assessment APIs.
// The Directus field selection below deliberately excludes the answer key,
// so the secret never enters freelancer-server memory. Freelancer output is
// serialized with toFreelancerTaskDTO, which structurally cannot leak it.

import {
  DEFAULT_TEXT_MAX_LENGTH,
  type AssessmentChoiceOption,
  type AssessmentTask,
  type AssessmentTaskType,
  type ExternalTask,
  type FileUploadTask,
  type TextResponseTask,
} from "@/modules/shared/assessment";
import { directusList } from "./directus";

const TASK_FIELDS = [
  "id",
  "job_stage_id",
  "task_type",
  "title",
  "instructions",
  "is_required",
  "sort_order",
  "choice_options",
  "external_url",
  "text_max_length",
].join(",");

export interface JobTaskRow {
  id: number;
  job_stage_id: number;
  task_type: AssessmentTaskType;
  title: string;
  instructions: string | null;
  is_required: boolean;
  sort_order: number;
  choice_options: AssessmentChoiceOption[] | null;
  external_url: string | null;
  text_max_length: number | null;
}

/**
 * Answer-key-free snapshot. The single-choice variant carries everything the
 * freelancer may see (options without the answer); the shared validator only
 * reads choice_options for that type, so validation stays exact while the
 * answer key is unrepresentable here by construction.
 */
export interface SnapshotSingleChoiceTask {
  task_type: "SINGLE_CHOICE";
  title: string;
  instructions?: string;
  is_required: boolean;
  sort_order: number;
  choice_options: AssessmentChoiceOption[];
}

export type SnapshotTask =
  | SnapshotSingleChoiceTask
  | ExternalTask
  | FileUploadTask
  | TextResponseTask;

/** Bridge to the shared validator, which types its input as AssessmentTask. */
export function asValidatableTask(task: SnapshotTask): AssessmentTask {
  return task as AssessmentTask;
}

function isTaskType(value: unknown): value is AssessmentTaskType {
  return (
    value === "SINGLE_CHOICE" ||
    value === "EXTERNAL_TASK" ||
    value === "FILE_UPLOAD" ||
    value === "TEXT_RESPONSE"
  );
}

function toChoiceOptions(value: unknown): AssessmentChoiceOption[] | null {
  if (!Array.isArray(value)) return null;
  const options: AssessmentChoiceOption[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const record = entry as Record<string, unknown>;
    if (typeof record.key !== "string" || typeof record.label !== "string") return null;
    options.push({ key: record.key, label: record.label });
  }
  return options;
}

export function normalizeTaskRow(raw: Record<string, unknown>): JobTaskRow | null {
  const id = Number(raw.id);
  const stageId = Number(raw.job_stage_id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (!Number.isSafeInteger(stageId) || stageId <= 0) return null;
  if (!isTaskType(raw.task_type)) return null;
  return {
    id,
    job_stage_id: stageId,
    task_type: raw.task_type,
    title: String(raw.title ?? ""),
    instructions: typeof raw.instructions === "string" ? raw.instructions : null,
    is_required: raw.is_required === true || raw.is_required === 1,
    sort_order: Number(raw.sort_order ?? 0),
    choice_options: toChoiceOptions(raw.choice_options),
    external_url: typeof raw.external_url === "string" ? raw.external_url : null,
    text_max_length: typeof raw.text_max_length === "number" ? raw.text_max_length : null,
  };
}

export function toSnapshotTask(row: JobTaskRow): SnapshotTask {
  const base = {
    title: row.title,
    instructions: row.instructions ?? undefined,
    is_required: row.is_required,
    sort_order: row.sort_order,
  };
  switch (row.task_type) {
    case "SINGLE_CHOICE":
      return {
        ...base,
        task_type: "SINGLE_CHOICE",
        choice_options: row.choice_options ?? [],
      };
    case "EXTERNAL_TASK":
      return { ...base, task_type: "EXTERNAL_TASK", external_url: row.external_url ?? "" };
    case "FILE_UPLOAD":
      return { ...base, task_type: "FILE_UPLOAD" };
    case "TEXT_RESPONSE":
      return {
        ...base,
        task_type: "TEXT_RESPONSE",
        text_max_length: row.text_max_length ?? DEFAULT_TEXT_MAX_LENGTH,
      };
  }
}

export async function fetchStageTasks(stageId: number): Promise<JobTaskRow[]> {
  const params = new URLSearchParams({
    "filter[job_stage_id][_eq]": String(stageId),
    fields: TASK_FIELDS,
    "sort[]": "sort_order",
    limit: "-1",
  });
  const rows = await directusList("vs_job_pipeline_assessment_tasks", params);
  const tasks: JobTaskRow[] = [];
  for (const raw of rows) {
    const row = normalizeTaskRow(raw);
    if (row) tasks.push(row);
  }
  tasks.sort((a, b) => a.sort_order - b.sort_order);
  return tasks;
}
