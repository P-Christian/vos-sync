// src/modules/client/pipeline/services/assessment-task.read.ts
// Read path for company assessment tasks: ownership-checked stage listing.

import { getPipelineWithDetails } from "./pipeline.service";
import {
  fetchStageTasks,
  getCompanyAssessmentStage,
  type AssessmentTaskResult,
  type CompanyAssessmentTaskRow,
} from "./assessment-task.store";

/**
 * Lists assessment tasks for a company pipeline ASSESSMENT stage.
 */
export async function listCompanyAssessmentTasks(
  pipelineId: number,
  stageId: number,
  companyId: number
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
    const tasks = await fetchStageTasks(stageId);
    return { ok: true, data: tasks };
  } catch (error) {
    console.error(
      "[assessment-task.service] listCompanyAssessmentTasks error:",
      error
    );
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}
