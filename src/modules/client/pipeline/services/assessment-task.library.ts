// src/modules/client/pipeline/services/assessment-task.library.ts
// Company-scoped assessment-task library: every task across all of the
// company's pipelines/stages, labelled for the reuse picker. Copy-only;
// the editor prefills the create form from a row, never a live reference.

import { getCompanyPipelines, getPipelineWithDetails } from "./pipeline.service";
import {
  normalizeRow,
  type AssessmentTaskResult,
  type CompanyAssessmentTaskRow,
} from "./assessment-task.store";

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

export interface LibraryTask extends CompanyAssessmentTaskRow {
  stage_name: string;
  pipeline_name: string;
}

/**
 * Lists the company's assessment tasks across ALL its pipelines/stages.
 * Company-scoped only: pipelines are resolved via company ownership, then
 * only ASSESSMENT stage ids are queried.
 */
export async function listCompanyAssessmentTaskLibrary(
  companyId: number
): Promise<AssessmentTaskResult<LibraryTask[]>> {
  try {
    const pipelines = await getCompanyPipelines(companyId);
    const stageLabels = new Map<
      number,
      { stage_name: string; pipeline_name: string }
    >();
    for (const pipeline of pipelines) {
      const detailed =
        pipeline.stages !== undefined
          ? pipeline
          : await getPipelineWithDetails(pipeline.id, companyId);
      if (!detailed || detailed.company_id !== companyId) continue;
      for (const stage of detailed.stages ?? []) {
        if (stage.stage_type === "ASSESSMENT") {
          stageLabels.set(stage.id, {
            stage_name: stage.stage_name,
            pipeline_name: detailed.name,
          });
        }
      }
    }
    if (stageLabels.size === 0) return { ok: true, data: [] };

    const ids = [...stageLabels.keys()].join(",");
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_pipeline_assessment_tasks?filter[company_stage_id][_in]=${ids}&limit=-1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Directus library list failed: ${res.status}`);
    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    const tasks: LibraryTask[] = [];
    for (const raw of json.data ?? []) {
      const row = normalizeRow(raw);
      const labels = stageLabels.get(row.company_stage_id);
      if (!labels) continue;
      tasks.push({ ...row, ...labels });
    }
    return { ok: true, data: tasks };
  } catch (error) {
    console.error(
      "[assessment-task.library] listCompanyAssessmentTaskLibrary error:",
      error
    );
    return { ok: false, error: "DIRECTUS_ERROR" };
  }
}
