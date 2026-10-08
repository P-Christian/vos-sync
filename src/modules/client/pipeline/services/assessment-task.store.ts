// src/modules/client/pipeline/services/assessment-task.store.ts
// Directus access layer for company assessment tasks: connection helpers,
// row contracts, payload mapping, and company-ownership resolution.

import {
  type AssessmentChoiceOption,
  type AssessmentTaskType,
  type CreateTaskInput,
} from "@/modules/shared/assessment";
import { getPipelineWithDetails } from "./pipeline.service";
import type { PipelineStage } from "../types";

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

const TASK_COLLECTION = "vs_company_pipeline_assessment_tasks";

export interface CompanyAssessmentTaskRow {
  id: number;
  company_stage_id: number;
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

export type AssessmentTaskServiceError =
  | "PIPELINE_NOT_FOUND"
  | "STAGE_NOT_FOUND"
  | "STAGE_NOT_ASSESSMENT"
  | "TASK_NOT_FOUND"
  | "TASK_TYPE_MISMATCH"
  | "INVALID_INPUT"
  | "ORDER_MISMATCH"
  | "DIRECTUS_ERROR";

export type AssessmentTaskResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AssessmentTaskServiceError; details?: string };

export interface DirectusTaskPayload {
  company_stage_id?: number;
  task_type?: AssessmentTaskType;
  title?: string;
  instructions?: string | null;
  is_required?: boolean;
  sort_order?: number;
  choice_options?: AssessmentChoiceOption[] | null;
  correct_choice_key?: string | null;
  external_url?: string | null;
  text_max_length?: number | null;
  created_at?: string;
  updated_at?: string;
}

export function normalizeRow(
  raw: Record<string, unknown>
): CompanyAssessmentTaskRow {
  const choiceOptions = raw.choice_options;
  return {
    id: Number(raw.id),
    company_stage_id: Number(raw.company_stage_id),
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

export function toDirectusPayload(
  input: CreateTaskInput,
  companyStageId: number,
  sortOrder: number,
  nowUtc: string
): DirectusTaskPayload {
  const base = {
    company_stage_id: companyStageId,
    title: input.title,
    instructions: input.instructions ?? null,
    is_required: input.is_required,
    sort_order: sortOrder,
    created_at: nowUtc,
    updated_at: nowUtc,
  };
  switch (input.task_type) {
    case "SINGLE_CHOICE":
      return {
        ...base,
        task_type: "SINGLE_CHOICE",
        choice_options: input.choice_options,
        correct_choice_key: input.correct_choice_key,
        external_url: null,
        text_max_length: null,
      };
    case "EXTERNAL_TASK":
      return {
        ...base,
        task_type: "EXTERNAL_TASK",
        choice_options: null,
        correct_choice_key: null,
        external_url: input.external_url,
        text_max_length: null,
      };
    case "FILE_UPLOAD":
      return {
        ...base,
        task_type: "FILE_UPLOAD",
        choice_options: null,
        correct_choice_key: null,
        external_url: null,
        text_max_length: null,
      };
    case "TEXT_RESPONSE":
      return {
        ...base,
        task_type: "TEXT_RESPONSE",
        choice_options: null,
        correct_choice_key: null,
        external_url: null,
        text_max_length: input.text_max_length,
      };
  }
}

/**
 * Resolves a company pipeline stage by ownership. Returns null when the
 * pipeline does not belong to the company or the stage is not on it.
 */
export async function getCompanyAssessmentStage(
  pipelineId: number,
  stageId: number,
  companyId: number
): Promise<PipelineStage | null> {
  const pipeline = await getPipelineWithDetails(pipelineId, companyId);
  if (!pipeline) return null;
  return pipeline.stages?.find((s) => s.id === stageId) ?? null;
}

export async function fetchStageTasks(
  stageId: number
): Promise<CompanyAssessmentTaskRow[]> {
  const res = await fetch(
    `${DIRECTUS_BASE}/items/${TASK_COLLECTION}?filter[company_stage_id][_eq]=${stageId}&sort=sort_order&limit=-1`,
    { headers: getHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Directus list failed: ${res.status}`);
  const json = (await res.json()) as { data?: Record<string, unknown>[] };
  return (json.data ?? []).map(normalizeRow);
}

export async function fetchTaskCollection(
  path: string,
  init: RequestInit
): Promise<Response> {
  return fetch(`${DIRECTUS_BASE}/items/${TASK_COLLECTION}${path}`, {
    ...init,
    headers: getHeaders(),
  });
}
