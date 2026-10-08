// src/modules/client/pipeline/services/assessment-task.order.ts
// Delete + reorder paths for company assessment tasks. Both finish with
// deterministic 1..n re-numbering of the stage's surviving tasks.

import { getPipelineWithDetails } from "./pipeline.service";
import {
  fetchStageTasks,
  fetchTaskCollection,
  getCompanyAssessmentStage,
  type AssessmentTaskResult,
  type CompanyAssessmentTaskRow,
} from "./assessment-task.store";

/**
 * Deletes an assessment task, then re-numbers survivors deterministically.
 */
export async function deleteCompanyAssessmentTask(
  pipelineId: number,
  stageId: number,
  taskId: number,
  companyId: number
): Promise<AssessmentTaskResult<{ deleted: boolean }>> {
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

    const res = await fetchTaskCollection(`/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) return { ok: false, error: "DIRECTUS_ERROR" };

    const nowUtc = new Date().toISOString();
    let order = 1;
    for (const task of existing) {
      if (task.id === taskId) continue;
      await fetchTaskCollection(`/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sort_order: order++, updated_at: nowUtc }),
      });
    }

    return { ok: true, data: { deleted: true } };
  } catch (error) {
    console.error(
      "[assessment-task.service] deleteCompanyAssessmentTask error:",
      error
    );
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}

/**
 * Reorders tasks with deterministic 1..n re-numbering in the given order.
 * The id list must cover exactly the stage's tasks.
 */
export async function reorderCompanyAssessmentTasks(
  pipelineId: number,
  stageId: number,
  companyId: number,
  orderedTaskIds: number[]
): Promise<AssessmentTaskResult<CompanyAssessmentTaskRow[]>> {
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
    const existingIds = new Set(existing.map((t) => t.id));
    const uniqueIds = new Set(orderedTaskIds);
    const coversExactly =
      orderedTaskIds.length === existing.length &&
      uniqueIds.size === orderedTaskIds.length &&
      orderedTaskIds.every((id) => existingIds.has(id));
    if (!coversExactly) return { ok: false, error: "ORDER_MISMATCH" };

    const nowUtc = new Date().toISOString();
    let order = 1;
    for (const taskId of orderedTaskIds) {
      await fetchTaskCollection(`/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ sort_order: order++, updated_at: nowUtc }),
      });
    }

    const refreshed = await fetchStageTasks(stageId);
    return { ok: true, data: refreshed };
  } catch (error) {
    console.error(
      "[assessment-task.service] reorderCompanyAssessmentTasks error:",
      error
    );
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}
