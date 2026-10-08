// src/modules/client/pipeline/services/job-assessment-task.service.ts
// Job-scoped (frozen snapshot) assessment task operations. Reads company
// template tasks only; every write targets vs_job_pipeline_assessment_tasks.
// Job edits never write back to vs_company_pipeline_assessment_tasks.

import {
  createTaskInputSchema,
  DEFAULT_TEXT_MAX_LENGTH,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/modules/shared/assessment";
import { fetchStageTasks } from "./assessment-task.store";
import {
  fetchJobTasks,
  getJobAssessmentStage,
  jobTaskCollection,
  normalizeJobRow,
  toJobTaskPayload,
  type JobAssessmentTaskResult,
  type JobAssessmentTaskRow,
} from "./job-assessment-task.store";

export type {
  JobAssessmentTaskError,
  JobAssessmentTaskResult,
  JobAssessmentTaskRow,
  JobAssessmentStageRef,
} from "./job-assessment-task.store";
export { getJobAssessmentStage } from "./job-assessment-task.store";

/** Lists frozen assessment tasks for a job ASSESSMENT stage. */
export async function listJobAssessmentTasks(
  jobId: number,
  stageId: number
): Promise<JobAssessmentTaskResult<JobAssessmentTaskRow[]>> {
  try {
    const stage = await getJobAssessmentStage(jobId, stageId);
    if (!stage.ok) return stage;
    return { ok: true, data: await fetchJobTasks(stageId) };
  } catch (error) {
    console.error("[job-assessment-task.service] listJobAssessmentTasks error:", error);
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}

/** Creates a job-scoped task appended at the end of the stage order. */
export async function createJobAssessmentTask(
  jobId: number,
  stageId: number,
  input: CreateTaskInput
): Promise<JobAssessmentTaskResult<JobAssessmentTaskRow>> {
  try {
    const stage = await getJobAssessmentStage(jobId, stageId);
    if (!stage.ok) return stage;
    const existing = await fetchJobTasks(stageId);
    const nextOrder = existing.reduce((max, t) => Math.max(max, t.sort_order), 0) + 1;
    const nowUtc = new Date().toISOString();
    const res = await jobTaskCollection("", {
      method: "POST",
      body: JSON.stringify(toJobTaskPayload(input, stageId, null, nextOrder, nowUtc)),
    });
    if (!res.ok) {
      console.error("[job-assessment-task.service] create failed:", await res.text());
      return { ok: false, error: "DIRECTUS_ERROR" };
    }
    const json = (await res.json()) as { data?: Record<string, unknown> };
    if (!json.data) return { ok: false, error: "DIRECTUS_ERROR" };
    return { ok: true, data: normalizeJobRow(json.data) };
  } catch (error) {
    console.error("[job-assessment-task.service] createJobAssessmentTask error:", error);
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}

/** Updates a job task; merged values re-validate against the shared schema. */
export async function updateJobAssessmentTask(
  jobId: number,
  stageId: number,
  taskId: number,
  input: UpdateTaskInput
): Promise<JobAssessmentTaskResult<JobAssessmentTaskRow>> {
  try {
    const stage = await getJobAssessmentStage(jobId, stageId);
    if (!stage.ok) return stage;
    const existing = await fetchJobTasks(stageId);
    const row = existing.find((t) => t.id === taskId);
    if (!row) return { ok: false, error: "TASK_NOT_FOUND" };
    if (input.task_type !== row.task_type) {
      return { ok: false, error: "TASK_TYPE_MISMATCH" };
    }
    const merged: Record<string, unknown> = {
      task_type: row.task_type,
      title: input.title ?? row.title,
      instructions: input.instructions ?? row.instructions ?? undefined,
      is_required: input.is_required ?? row.is_required,
      sort_order: input.sort_order ?? row.sort_order,
    };
    if (row.task_type === "SINGLE_CHOICE") {
      const u = input.task_type === "SINGLE_CHOICE" ? input : null;
      merged.choice_options = u?.choice_options ?? row.choice_options ?? [];
      merged.correct_choice_key = u?.correct_choice_key ?? row.correct_choice_key ?? "";
    } else if (row.task_type === "EXTERNAL_TASK") {
      const u = input.task_type === "EXTERNAL_TASK" ? input : null;
      merged.external_url = u?.external_url ?? row.external_url ?? "";
    } else if (row.task_type === "TEXT_RESPONSE") {
      const u = input.task_type === "TEXT_RESPONSE" ? input : null;
      merged.text_max_length = u?.text_max_length ?? row.text_max_length ?? DEFAULT_TEXT_MAX_LENGTH;
    }
    const parsed = createTaskInputSchema.safeParse(merged);
    if (!parsed.success) {
      return {
        ok: false,
        error: "INVALID_INPUT",
        details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      };
    }
    const nowUtc = new Date().toISOString();
    const payload = toJobTaskPayload(parsed.data, stageId, row.source_company_task_id, parsed.data.sort_order, nowUtc);
    const { created_at: _created, job_stage_id: _stage, source_company_task_id: _source, ...patch } = payload;
    void _created;
    void _stage;
    void _source;
    const res = await jobTaskCollection(`/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      console.error("[job-assessment-task.service] update failed:", await res.text());
      return { ok: false, error: "DIRECTUS_ERROR" };
    }
    const json = (await res.json()) as { data?: Record<string, unknown> };
    if (!json.data) return { ok: false, error: "DIRECTUS_ERROR" };
    return { ok: true, data: normalizeJobRow(json.data) };
  } catch (error) {
    console.error("[job-assessment-task.service] updateJobAssessmentTask error:", error);
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}

/** Deletes a job task, then re-numbers survivors deterministically. */
export async function deleteJobAssessmentTask(
  jobId: number,
  stageId: number,
  taskId: number
): Promise<JobAssessmentTaskResult<{ deleted: boolean }>> {
  try {
    const stage = await getJobAssessmentStage(jobId, stageId);
    if (!stage.ok) return stage;
    const existing = await fetchJobTasks(stageId);
    if (!existing.some((t) => t.id === taskId)) {
      return { ok: false, error: "TASK_NOT_FOUND" };
    }
    const res = await jobTaskCollection(`/${taskId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: "DIRECTUS_ERROR" };
    const nowUtc = new Date().toISOString();
    let order = 1;
    for (const task of existing) {
      if (task.id === taskId) continue;
      await jobTaskCollection(`/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sort_order: order++, updated_at: nowUtc }),
      });
    }
    return { ok: true, data: { deleted: true } };
  } catch (error) {
    console.error("[job-assessment-task.service] deleteJobAssessmentTask error:", error);
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}

/** Reorders job tasks; the id list must cover exactly the stage's tasks. */
export async function reorderJobAssessmentTasks(
  jobId: number,
  stageId: number,
  orderedTaskIds: number[]
): Promise<JobAssessmentTaskResult<JobAssessmentTaskRow[]>> {
  try {
    const stage = await getJobAssessmentStage(jobId, stageId);
    if (!stage.ok) return stage;
    const existing = await fetchJobTasks(stageId);
    const existingIds = new Set(existing.map((t) => t.id));
    const uniqueIds = new Set(orderedTaskIds);
    const coversExactly =
      orderedTaskIds.length === existing.length &&
      uniqueIds.size === orderedTaskIds.length &&
      orderedTaskIds.every((id) => existingIds.has(id));
    if (!coversExactly) return { ok: false, error: "ORDER_MISMATCH" };
    const nowUtc = new Date().toISOString();
    let order = 1;
    for (const id of orderedTaskIds) {
      await jobTaskCollection(`/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ sort_order: order++, updated_at: nowUtc }),
      });
    }
    return { ok: true, data: await fetchJobTasks(stageId) };
  } catch (error) {
    console.error("[job-assessment-task.service] reorderJobAssessmentTasks error:", error);
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}

/**
 * Snapshot copy result. `createdIds` is ALWAYS populated — including on
 * failure — so callers can compensate (delete) partially created rows.
 */
export type CopyCompanyTasksResult =
  | { ok: true; data: JobAssessmentTaskRow[]; createdIds: number[] }
  | { ok: false; error: "DIRECTUS_ERROR"; createdIds: number[] };

/**
 * Snapshots company template tasks into frozen job rows for one job stage.
 * Preserves sort_order and stamps source_company_task_id on every row.
 * Never writes to vs_company_pipeline_assessment_tasks.
 */
export async function copyCompanyTasksToJobStage(
  jobStageId: number,
  companyStageId: number
): Promise<CopyCompanyTasksResult> {
  const created: JobAssessmentTaskRow[] = [];
  const createdIds = (): number[] => created.map((task) => task.id);
  try {
    const source = await fetchStageTasks(companyStageId);
    const nowUtc = new Date().toISOString();
    for (const task of source) {
      const res = await jobTaskCollection("", {
        method: "POST",
        body: JSON.stringify({
          job_stage_id: jobStageId,
          source_company_task_id: task.id,
          task_type: task.task_type,
          title: task.title,
          instructions: task.instructions,
          is_required: task.is_required,
          sort_order: task.sort_order,
          choice_options: task.choice_options,
          correct_choice_key: task.correct_choice_key,
          external_url: task.external_url,
          text_max_length: task.text_max_length,
          created_at: nowUtc,
          updated_at: nowUtc,
        }),
      });
      if (!res.ok) {
        console.error("[job-assessment-task.service] snapshot copy failed:", await res.text());
        return { ok: false, error: "DIRECTUS_ERROR", createdIds: createdIds() };
      }
      const json = (await res.json()) as { data?: Record<string, unknown> };
      if (!json.data) return { ok: false, error: "DIRECTUS_ERROR", createdIds: createdIds() };
      created.push(normalizeJobRow(json.data));
    }
    return { ok: true, data: created, createdIds: createdIds() };
  } catch (error) {
    console.error("[job-assessment-task.service] copyCompanyTasksToJobStage error:", error);
    return { ok: false, error: "DIRECTUS_ERROR", createdIds: createdIds() };
  }
}
