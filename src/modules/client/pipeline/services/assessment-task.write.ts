// src/modules/client/pipeline/services/assessment-task.write.ts
// Create + update paths for company assessment tasks. Creates append at the
// end of the stage order; updates merge with the stored row and re-validate
// against the shared create schema so partial updates stay valid.

import {
  createTaskInputSchema,
  DEFAULT_TEXT_MAX_LENGTH,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/modules/shared/assessment";
import { getPipelineWithDetails } from "./pipeline.service";
import {
  fetchStageTasks,
  fetchTaskCollection,
  getCompanyAssessmentStage,
  normalizeRow,
  toDirectusPayload,
  type AssessmentTaskResult,
  type CompanyAssessmentTaskRow,
} from "./assessment-task.store";

/**
 * Creates an assessment task appended at the end of the stage order.
 * The server assigns `sort_order` deterministically (max + 1).
 */
export async function createCompanyAssessmentTask(
  pipelineId: number,
  stageId: number,
  companyId: number,
  input: CreateTaskInput
): Promise<AssessmentTaskResult<CompanyAssessmentTaskRow>> {
  try {
    const stage = await getCompanyAssessmentStage(
      pipelineId,
      stageId,
      companyId
    );
    if (!stage) {
      const pipeline = await getPipelineWithDetails(pipelineId, companyId);
      if (!pipeline) return { ok: false, error: "PIPELINE_NOT_FOUND" };
      return { ok: false, error: "STAGE_NOT_FOUND" };
    }
    if (stage.stage_type !== "ASSESSMENT") {
      return { ok: false, error: "STAGE_NOT_ASSESSMENT" };
    }

    const existing = await fetchStageTasks(stageId);
    const nextOrder =
      existing.reduce((max, t) => Math.max(max, t.sort_order), 0) + 1;
    const nowUtc = new Date().toISOString();

    const res = await fetchTaskCollection("", {
      method: "POST",
      body: JSON.stringify(
        toDirectusPayload(input, stageId, nextOrder, nowUtc)
      ),
    });
    if (!res.ok) {
      console.error(
        "[assessment-task.service] create failed:",
        await res.text()
      );
      return { ok: false, error: "DIRECTUS_ERROR" };
    }
    const json = (await res.json()) as { data?: Record<string, unknown> };
    if (!json.data) return { ok: false, error: "DIRECTUS_ERROR" };
    return { ok: true, data: normalizeRow(json.data) };
  } catch (error) {
    console.error(
      "[assessment-task.service] createCompanyAssessmentTask error:",
      error
    );
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}

/**
 * Updates an assessment task. The update payload's `task_type` must match
 * the stored row; merged values are re-validated against the shared create
 * schema so partial updates cannot produce an invalid task.
 */
export async function updateCompanyAssessmentTask(
  pipelineId: number,
  stageId: number,
  taskId: number,
  companyId: number,
  input: UpdateTaskInput
): Promise<AssessmentTaskResult<CompanyAssessmentTaskRow>> {
  try {
    const stage = await getCompanyAssessmentStage(
      pipelineId,
      stageId,
      companyId
    );
    if (!stage) {
      const pipeline = await getPipelineWithDetails(pipelineId, companyId);
      if (!pipeline) return { ok: false, error: "PIPELINE_NOT_FOUND" };
      return { ok: false, error: "STAGE_NOT_FOUND" };
    }
    if (stage.stage_type !== "ASSESSMENT") {
      return { ok: false, error: "STAGE_NOT_ASSESSMENT" };
    }

    const existing = await fetchStageTasks(stageId);
    const row = existing.find((t) => t.id === taskId);
    if (!row) return { ok: false, error: "TASK_NOT_FOUND" };
    if (input.task_type !== row.task_type) {
      return { ok: false, error: "TASK_TYPE_MISMATCH" };
    }

    const mergedBase = {
      title: input.title ?? row.title,
      instructions: input.instructions ?? row.instructions ?? undefined,
      is_required: input.is_required ?? row.is_required,
      sort_order: input.sort_order ?? row.sort_order,
    };
    let merged: CreateTaskInput;
    switch (row.task_type) {
      case "SINGLE_CHOICE": {
        const singleInput =
          input.task_type === "SINGLE_CHOICE" ? input : null;
        merged = {
          task_type: "SINGLE_CHOICE",
          ...mergedBase,
          choice_options:
            singleInput?.choice_options ?? row.choice_options ?? [],
          correct_choice_key:
            singleInput?.correct_choice_key ?? row.correct_choice_key ?? "",
        };
        break;
      }
      case "EXTERNAL_TASK": {
        const externalInput =
          input.task_type === "EXTERNAL_TASK" ? input : null;
        merged = {
          task_type: "EXTERNAL_TASK",
          ...mergedBase,
          external_url:
            externalInput?.external_url ?? row.external_url ?? "",
        };
        break;
      }
      case "FILE_UPLOAD":
        merged = { task_type: "FILE_UPLOAD", ...mergedBase };
        break;
      case "TEXT_RESPONSE": {
        const textInput =
          input.task_type === "TEXT_RESPONSE" ? input : null;
        merged = {
          task_type: "TEXT_RESPONSE",
          ...mergedBase,
          text_max_length:
            textInput?.text_max_length ??
            row.text_max_length ??
            DEFAULT_TEXT_MAX_LENGTH,
        };
        break;
      }
    }

    const parsed = createTaskInputSchema.safeParse(merged);
    if (!parsed.success) {
      return {
        ok: false,
        error: "INVALID_INPUT",
        details: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      };
    }

    const nowUtc = new Date().toISOString();
    const payload = toDirectusPayload(
      parsed.data,
      stageId,
      parsed.data.sort_order,
      nowUtc
    );
    const { created_at: _created, company_stage_id: _stage, ...patch } =
      payload;
    void _created;
    void _stage;

    const res = await fetchTaskCollection(`/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      console.error(
        "[assessment-task.service] update failed:",
        await res.text()
      );
      return { ok: false, error: "DIRECTUS_ERROR" };
    }
    const json = (await res.json()) as { data?: Record<string, unknown> };
    if (!json.data) return { ok: false, error: "DIRECTUS_ERROR" };
    return { ok: true, data: normalizeRow(json.data) };
  } catch (error) {
    console.error(
      "[assessment-task.service] updateCompanyAssessmentTask error:",
      error
    );
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}
