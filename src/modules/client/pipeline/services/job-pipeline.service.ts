// src/modules/client/pipeline/services/job-pipeline.service.ts

import {
  CanonicalStageType,
  JobPipelineStage,
  JobPipelineTransition,
  JobPipelineVersion,
  LEGACY_STATUS_TO_CANONICAL_MAP,
  CANONICAL_TO_LEGACY_STATUS_MAP,
  STAGE_TYPE_DETAILS,
} from "../types";
import {
  getPipelineWithDetails,
  isValidStageType,
  isTerminalStageType,
  seedDefaultCompanyPipeline,
} from "./pipeline.service";
import { copyCompanyTasksToJobStage } from "./job-assessment-task.service";
import { checkAssessmentGate, isQualifyingAssessmentMove, isValidAssessmentOutcome, recordAssessmentMoveOutcome } from "@/modules/client/assessment-review/services/gate";
import {
  deriveAssessmentDeadline,
  parseWindowDays,
} from "@/modules/freelancer/freelancer-applications/services/assessment/deadline";
import { createNotification } from "@/lib/notifications";
import { formatDateLong, getPHTimeString } from "@/lib/utils";

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

/**
 * Best-effort delete of one Directus item during snapshot compensation.
 */
async function deleteJobSnapshotItem(
  collection: string,
  id: number
): Promise<void> {
  try {
    await fetch(`${DIRECTUS_BASE}/items/${collection}/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  } catch (err) {
    console.error(
      `[job-pipeline.service] compensation delete failed for ${collection}#${id}:`,
      err
    );
  }
}

/**
 * Snapshot compensation: deletes every created job task, transition, stage,
 * and pipeline version in reverse child-to-parent order so no partial active
 * version remains after a failed snapshot.
 */
async function compensateJobSnapshot(
  versionId: number | null,
  stageIds: number[],
  transitionIds: number[],
  taskIds: number[]
): Promise<void> {
  for (const taskId of taskIds) {
    await deleteJobSnapshotItem("vs_job_pipeline_assessment_tasks", taskId);
  }
  for (let i = transitionIds.length - 1; i >= 0; i--) {
    await deleteJobSnapshotItem("vs_job_pipeline_transitions", transitionIds[i]);
  }
  for (let i = stageIds.length - 1; i >= 0; i--) {
    await deleteJobSnapshotItem("vs_job_pipeline_stages", stageIds[i]);
  }
  if (versionId !== null) {
    await deleteJobSnapshotItem("vs_job_pipeline_versions", versionId);
  }
}

/**
 * Checks whether applications exist for a given job.
 * Authoritative backend lock check to prevent race conditions.
 */
export async function getJobApplicationCount(jobId: number): Promise<number> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[job_id][_eq]=${jobId}&filter[withdrawal_reason][_null]=true&aggregate[count]=application_id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (res.ok) {
      const json = await res.json();
      const count = Number(json.data?.[0]?.count?.application_id ?? json.data?.[0]?.count ?? 0);
      if (!isNaN(count) && count > 0) return count;
    }

    // Fallback direct count fetch
    const listRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[job_id][_eq]=${jobId}&fields=application_id&limit=100`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (listRes.ok) {
      const listJson = await listRes.json();
      return (listJson.data ?? []).length;
    }

    return 0;
  } catch (err) {
    console.error(`[job-pipeline.service] Error checking applications for job #${jobId}:`, err);
    return 0;
  }
}

/**
 * Validates whether the active job pipeline version can be modified.
 * Immutability rule: active job pipeline version is locked if application_count > 0.
 */
export async function canModifyJobPipeline(
  jobId: number
): Promise<{ canModify: boolean; applicationCount: number; error?: string }> {
  const count = await getJobApplicationCount(jobId);
  if (count > 0) {
    return {
      canModify: false,
      applicationCount: count,
      error: `This job's hiring pipeline is immutable because it has already received ${count} application(s). Modifying active candidate workflow is forbidden.`,
    };
  }
  return { canModify: true, applicationCount: 0 };
}

/**
 * Retrieves the company_id associated with a job posting.
 */
export async function getJobCompanyId(jobId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_posting/${jobId}?fields=job_id,company_id`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.company_id ?? null;
  } catch (err) {
    console.error(`[job-pipeline.service] Error fetching job #${jobId}:`, err);
    return null;
  }
}

/**
 * Snapshots a company pipeline template into a dedicated Job Pipeline Version.
 * Copies all stages and re-maps transitions with new job-stage IDs.
 */
export async function snapshotCompanyPipeline(
  jobId: number,
  companyId: number,
  sourcePipelineId?: number
): Promise<JobPipelineVersion | null> {
  let createdVersionId: number | null = null;
  const createdJobStageIds: number[] = [];
  const createdJobTransitionIds: number[] = [];
  const createdJobTaskIds: number[] = [];

  const rollbackAndFail = async (message: string): Promise<null> => {
    console.error(`[job-pipeline.service] snapshotCompanyPipeline aborting: ${message}`);
    await compensateJobSnapshot(
      createdVersionId,
      createdJobStageIds,
      createdJobTransitionIds,
      createdJobTaskIds
    );
    return null;
  };

  try {
    const nowUtc = new Date().toISOString();

    // 1. Resolve source company pipeline template
    let sourcePipeline = sourcePipelineId
      ? await getPipelineWithDetails(sourcePipelineId, companyId)
      : null;

    if (!sourcePipeline) {
      // Find company default pipeline
      const defRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company_pipelines?filter[company_id][_eq]=${companyId}&filter[is_default][_eq]=true&limit=1`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (defRes.ok) {
        const defJson = await defRes.json();
        const defItem = defJson.data?.[0];
        if (defItem) {
          sourcePipeline = await getPipelineWithDetails(defItem.id, companyId);
        }
      }
    }

    // If company has no default pipeline, automatically seed it
    if (!sourcePipeline) {
      sourcePipeline = await seedDefaultCompanyPipeline(companyId);
    }

    if (!sourcePipeline || !sourcePipeline.stages || sourcePipeline.stages.length === 0) {
      throw new Error(`Failed to resolve company pipeline template for company #${companyId}`);
    }

    // 2. Determine version number for this job
    const prevVersionsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_versions?filter[job_id][_eq]=${jobId}&sort=-version&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    let nextVersion = 1;
    if (prevVersionsRes.ok) {
      const prevJson = await prevVersionsRes.json();
      const latest = prevJson.data?.[0];
      if (latest) {
        nextVersion = (latest.version ?? 0) + 1;
      }
    }

    // 3. Create new Job Pipeline Version header
    const createVerRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_versions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        job_id: jobId,
        source_pipeline_id: sourcePipeline.id,
        version: nextVersion,
        is_active: true,
        created_at: nowUtc,
      }),
    });

    if (!createVerRes.ok) {
      console.error("[job-pipeline.service] Failed creating job pipeline version header:", await createVerRes.text());
      return null;
    }

    const verJson = await createVerRes.json();
    const jobPipeline = verJson.data as JobPipelineVersion;
    if (!jobPipeline?.id) return null;
    createdVersionId = jobPipeline.id;

    // 4. Copy Stages into vs_job_pipeline_stages & build ID map: companyStageId -> jobStageId
    const companyToJobStageMap = new Map<number, number>();
    const createdJobStages: JobPipelineStage[] = [];

    for (const compStage of sourcePipeline.stages) {
      const stRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_stages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          job_pipeline_id: jobPipeline.id,
          stage_name: compStage.stage_name,
          stage_type: compStage.stage_type,
          stage_order: compStage.stage_order,
          color: compStage.color,
          description: compStage.description,
          is_terminal: compStage.is_terminal,
          is_system: compStage.is_system,
          assessment_submission_window_days: compStage.assessment_submission_window_days ?? null,
          created_at: nowUtc,
        }),
      });

      if (!stRes.ok) {
        return rollbackAndFail(
          `job stage creation failed for company stage #${compStage.id}`
        );
      }
      const stJson = await stRes.json();
      const newJobStage = stJson.data as JobPipelineStage;
      if (!newJobStage?.id) {
        return rollbackAndFail(
          `job stage creation returned no id for company stage #${compStage.id}`
        );
      }
      companyToJobStageMap.set(compStage.id, newJobStage.id);
      createdJobStages.push(newJobStage);
      createdJobStageIds.push(newJobStage.id);
    }

    // 5. Copy Transitions into vs_job_pipeline_transitions with remapped IDs
    const createdJobTransitions: JobPipelineTransition[] = [];
    for (const compTrans of sourcePipeline.transitions ?? []) {
      const mappedFromId = companyToJobStageMap.get(compTrans.from_stage_id);
      const mappedToId = companyToJobStageMap.get(compTrans.to_stage_id);

      if (mappedFromId && mappedToId) {
        const trRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_transitions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            job_pipeline_id: jobPipeline.id,
            from_stage_id: mappedFromId,
            to_stage_id: mappedToId,
            created_at: nowUtc,
          }),
        });

        if (!trRes.ok) {
          return rollbackAndFail(
            `job transition creation failed (${mappedFromId} -> ${mappedToId})`
          );
        }
        const trJson = await trRes.json();
        const newTr = trJson.data as JobPipelineTransition;
        if (!newTr?.id) {
          return rollbackAndFail(
            `job transition creation returned no id (${mappedFromId} -> ${mappedToId})`
          );
        }
        createdJobTransitions.push(newTr);
        createdJobTransitionIds.push(newTr.id);
      }
    }

    // 6. Copy assessment tasks for each ASSESSMENT stage into frozen job rows.
    // Supports zero or multiple ASSESSMENT stages in the template.
    for (const compStage of sourcePipeline.stages) {
      if (compStage.stage_type !== "ASSESSMENT") continue;
      const jobStageId = companyToJobStageMap.get(compStage.id);
      if (!jobStageId) {
        return rollbackAndFail(
          `missing job stage mapping for company ASSESSMENT stage #${compStage.id}`
        );
      }
      const copied = await copyCompanyTasksToJobStage(jobStageId, compStage.id);
      // Thread partial ids into compensation BEFORE checking ok, so a
      // mid-loop copy failure still rolls back rows created before it.
      for (const taskId of copied.createdIds) {
        createdJobTaskIds.push(taskId);
      }
      if (!copied.ok) {
        return rollbackAndFail(
          `assessment task snapshot failed for company stage #${compStage.id}`
        );
      }
    }

    // 7. Deactivate previous active versions only after the full snapshot
    // succeeded, so a failed snapshot never leaves a partial active version.
    await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_versions?filter[job_id][_eq]=${jobId}&filter[is_active][_eq]=true&filter[id][_neq]=${jobPipeline.id}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ is_active: false }),
      }
    );

    return {
      ...jobPipeline,
      stages: createdJobStages,
      transitions: createdJobTransitions,
      is_locked: false,
      application_count: 0,
    };
  } catch (err) {
    console.error("[job-pipeline.service] snapshotCompanyPipeline error:", err);
    await compensateJobSnapshot(
      createdVersionId,
      createdJobStageIds,
      createdJobTransitionIds,
      createdJobTaskIds
    );
    return null;
  }
}

/**
 * Bootstraps a job pipeline for an existing job that doesn't have one yet.
 * Also performs non-destructive backward-compatible migration of any existing applications.
 */
export async function bootstrapJobPipeline(
  jobId: number,
  companyId?: number
): Promise<JobPipelineVersion | null> {
  try {
    const resolvedCompanyId = companyId ?? (await getJobCompanyId(jobId));
    if (!resolvedCompanyId) return null;

    const snapshot = await snapshotCompanyPipeline(jobId, resolvedCompanyId);
    if (!snapshot) return null;

    // Backward-compatible application migration:
    // Resolve existing applications for this job and map them to their canonical stage
    const appsRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_application?filter[job_id][_eq]=${jobId}&fields=application_id,application_status,current_stage_id&limit=1000`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (appsRes.ok) {
      const appsJson = await appsRes.json();
      const applications: Array<{
        application_id: number;
        application_status: string;
        current_stage_id?: number | null;
      }> = appsJson.data ?? [];

      const stages = snapshot.stages ?? [];
      const stageByType = new Map<CanonicalStageType, JobPipelineStage>();
      for (const st of stages) {
        if (!stageByType.has(st.stage_type)) {
          stageByType.set(st.stage_type, st);
        }
      }

      const appliedStage = stageByType.get("APPLIED") ?? stages[0];
      const nowUtc = new Date().toISOString();

      for (const app of applications) {
        if (!app.current_stage_id) {
          const rawStatus = (app.application_status || "APPLIED").toUpperCase();
          const canonicalType = LEGACY_STATUS_TO_CANONICAL_MAP[rawStatus] || "APPLIED";
          const matchedStage = stageByType.get(canonicalType) || appliedStage;

          if (matchedStage) {
            // Update application with current_stage_id
            await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${app.application_id}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ current_stage_id: matchedStage.id }),
            });

            // Write initial stage history record if none exists
            await fetch(`${DIRECTUS_BASE}/items/vs_application_stage_history`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                application_id: app.application_id,
                from_stage_id: null,
                to_stage_id: matchedStage.id,
                changed_by: null,
                change_reason: `Legacy ATS migration (${rawStatus} → ${canonicalType})`,
                created_at: nowUtc,
              }),
            });
          }
        }
      }
    }

    return snapshot;
  } catch (err) {
    console.error(`[job-pipeline.service] bootstrapJobPipeline error for job #${jobId}:`, err);
    return null;
  }
}

/**
 * Retrieves the active job pipeline version for a job with stages and transitions.
 * If the job does not have a pipeline yet, it automatically bootstraps one.
 */
export async function getJobPipeline(
  jobId: number,
  companyId?: number
): Promise<JobPipelineVersion | null> {
  try {
    // 1. Fetch active version
    const verRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_versions?filter[job_id][_eq]=${jobId}&filter[is_active][_eq]=true&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    let activeVersion: JobPipelineVersion | null = null;
    if (verRes.ok) {
      const verJson = await verRes.json();
      activeVersion = verJson.data?.[0] ?? null;
    }

    // 2. If no active version exists, bootstrap from company default
    if (!activeVersion) {
      activeVersion = await bootstrapJobPipeline(jobId, companyId);
      if (!activeVersion) return null;
    }

    // 3. Fetch stages for this job pipeline version
    const stagesRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_stages?filter[job_pipeline_id][_eq]=${activeVersion.id}&sort=stage_order`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const stagesJson = await stagesRes.json();
    const stages: JobPipelineStage[] = stagesJson.data ?? [];

    // 4. Fetch transitions
    const transRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_transitions?filter[job_pipeline_id][_eq]=${activeVersion.id}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const transJson = await transRes.json();
    const transitions: JobPipelineTransition[] = transJson.data ?? [];

    // 5. Enrich stages with allowed_next_stage_ids
    const transitionMap = new Map<number, number[]>();
    for (const t of transitions) {
      const list = transitionMap.get(t.from_stage_id) ?? [];
      list.push(t.to_stage_id);
      transitionMap.set(t.from_stage_id, list);
    }

    const enrichedStages = stages.map((s) => ({
      ...s,
      is_system: Boolean(s.is_system),
      is_terminal: Boolean(s.is_terminal),
      allowed_next_stage_ids: transitionMap.get(s.id) ?? [],
    }));

    // 6. Check real-time application count and locking state
    const applicationCount = await getJobApplicationCount(jobId);
    const isLocked = applicationCount > 0;

    return {
      ...activeVersion,
      stages: enrichedStages,
      transitions,
      is_locked: isLocked,
      application_count: applicationCount,
    };
  } catch (err) {
    console.error(`[job-pipeline.service] getJobPipeline error for job #${jobId}:`, err);
    return null;
  }
}

/**
 * Adds a new stage to an active job pipeline version.
 * Blocked if application_count > 0.
 */
export async function addJobPipelineStage(
  jobId: number,
  data: {
    stage_name: string;
    stage_type: CanonicalStageType;
    color?: string;
    description?: string;
  }
): Promise<{ success: boolean; stage?: JobPipelineStage; error?: string }> {
  try {
    const lockCheck = await canModifyJobPipeline(jobId);
    if (!lockCheck.canModify) {
      return { success: false, error: lockCheck.error };
    }

    const pipeline = await getJobPipeline(jobId);
    if (!pipeline) return { success: false, error: "Job pipeline not found." };

    if (!isValidStageType(data.stage_type)) {
      return { success: false, error: "Invalid canonical stage type." };
    }

    const isTerminal = isTerminalStageType(data.stage_type);
    const maxOrder = (pipeline.stages ?? []).reduce((max, s) => Math.max(max, s.stage_order), 0);
    const stageOrder = maxOrder + 1;

    const defaultColor = STAGE_TYPE_DETAILS[data.stage_type]?.defaultColor || "sky";
    const nowUtc = new Date().toISOString();

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_stages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        job_pipeline_id: pipeline.id,
        stage_name: data.stage_name.trim(),
        stage_type: data.stage_type,
        stage_order: stageOrder,
        color: data.color || defaultColor,
        description: data.description?.trim() || null,
        is_terminal: isTerminal,
        is_system: false,
        created_at: nowUtc,
      }),
    });

    if (!res.ok) {
      return { success: false, error: "Failed to create job pipeline stage." };
    }

    const json = await res.json();
    return { success: true, stage: json.data };
  } catch (err) {
    console.error("[job-pipeline.service] addJobPipelineStage error:", err);
    return { success: false, error: "Exception creating job stage." };
  }
}

/**
 * Updates a stage in an active job pipeline version.
 * Blocked if application_count > 0.
 */
export async function updateJobPipelineStage(
  jobId: number,
  stageId: number,
  data: {
    stage_name?: string;
    color?: string;
    description?: string;
    stage_order?: number;
    assessment_submission_window_days?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const lockCheck = await canModifyJobPipeline(jobId);
    if (!lockCheck.canModify) {
      return { success: false, error: lockCheck.error };
    }

    const pipeline = await getJobPipeline(jobId);
    if (!pipeline) return { success: false, error: "Job pipeline not found." };

    const stage = pipeline.stages?.find((s) => s.id === stageId);
    if (!stage) return { success: false, error: "Stage not found in this job pipeline." };

    const updatePayload: Record<string, unknown> = {};
    if (data.stage_name !== undefined) updatePayload.stage_name = data.stage_name.trim();
    if (data.color !== undefined) updatePayload.color = data.color;
    if (data.description !== undefined) updatePayload.description = data.description.trim() || null;
    if (data.stage_order !== undefined) updatePayload.stage_order = data.stage_order;
    if (data.assessment_submission_window_days !== undefined) {
      updatePayload.assessment_submission_window_days = data.assessment_submission_window_days;
    }

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_stages/${stageId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updatePayload),
    });

    return { success: res.ok };
  } catch (err) {
    console.error("[job-pipeline.service] updateJobPipelineStage error:", err);
    return { success: false, error: "Exception updating stage." };
  }
}

/**
 * Deletes a stage from an active job pipeline version.
 * Blocked if application_count > 0 or if stage is a system stage.
 */
export async function deleteJobPipelineStage(
  jobId: number,
  stageId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const lockCheck = await canModifyJobPipeline(jobId);
    if (!lockCheck.canModify) {
      return { success: false, error: lockCheck.error };
    }

    const pipeline = await getJobPipeline(jobId);
    if (!pipeline) return { success: false, error: "Job pipeline not found." };

    const stage = pipeline.stages?.find((s) => s.id === stageId);
    if (!stage) return { success: false, error: "Stage not found in this job pipeline." };

    if (stage.is_system) {
      return { success: false, error: "System stages are required and cannot be deleted." };
    }

    // 1. Delete associated transitions
    const transToDelete = (pipeline.transitions ?? []).filter(
      (t) => t.from_stage_id === stageId || t.to_stage_id === stageId
    );
    for (const t of transToDelete) {
      await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_transitions/${t.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    }

    // 2. Delete the stage
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_stages/${stageId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    return { success: res.ok };
  } catch (err) {
    console.error("[job-pipeline.service] deleteJobPipelineStage error:", err);
    return { success: false, error: "Exception deleting stage." };
  }
}

/**
 * Replaces transition routes for a stage in a job pipeline.
 * Blocked if application_count > 0.
 */
export async function updateJobPipelineTransitions(
  jobId: number,
  fromStageId: number,
  targetStageIds: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const lockCheck = await canModifyJobPipeline(jobId);
    if (!lockCheck.canModify) {
      return { success: false, error: lockCheck.error };
    }

    const pipeline = await getJobPipeline(jobId);
    if (!pipeline) return { success: false, error: "Job pipeline not found." };

    const stages = pipeline.stages ?? [];
    const fromStage = stages.find((s) => s.id === fromStageId);
    if (!fromStage) return { success: false, error: "Source stage not found in this job pipeline." };

    // Terminal integrity: Terminal stages cannot have outgoing transitions
    if (fromStage.is_terminal) {
      return { success: false, error: "Terminal stages cannot have outgoing transitions." };
    }

    // Stage ownership validation: all targets must belong to this job pipeline
    const stageIdSet = new Set(stages.map((s) => s.id));
    for (const toId of targetStageIds) {
      if (!stageIdSet.has(toId)) {
        return { success: false, error: `Destination stage #${toId} does not belong to this job pipeline.` };
      }
      if (toId === fromStageId) {
        return { success: false, error: "Self-transitions are not permitted." };
      }
    }

    // 1. Delete existing transitions for this from_stage_id
    const existing = (pipeline.transitions ?? []).filter((t) => t.from_stage_id === fromStageId);
    for (const t of existing) {
      await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_transitions/${t.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    }

    // 2. Insert new transitions
    const nowUtc = new Date().toISOString();
    for (const toId of targetStageIds) {
      await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_transitions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          job_pipeline_id: pipeline.id,
          from_stage_id: fromStageId,
          to_stage_id: toId,
          created_at: nowUtc,
        }),
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[job-pipeline.service] updateJobPipelineTransitions error:", err);
    return { success: false, error: "Exception updating transitions." };
  }
}

/**
 * Batch reorders stages for a job pipeline.
 * Blocked if application_count > 0.
 */
export async function reorderJobPipelineStages(
  jobId: number,
  orderedStageIds: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const lockCheck = await canModifyJobPipeline(jobId);
    if (!lockCheck.canModify) {
      return { success: false, error: lockCheck.error };
    }

    const pipeline = await getJobPipeline(jobId);
    if (!pipeline) return { success: false, error: "Job pipeline not found." };

    const stages = pipeline.stages ?? [];
    const stageMap = new Map(stages.map((s) => [s.id, s]));

    let order = 1;
    for (const stageId of orderedStageIds) {
      if (stageMap.has(stageId)) {
        await fetch(`${DIRECTUS_BASE}/items/vs_job_pipeline_stages/${stageId}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ stage_order: order++ }),
        });
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[job-pipeline.service] reorderJobPipelineStages error:", err);
    return { success: false, error: "Exception reordering stages." };
  }
}

/**
 * Assigns the initial stage and writes the authoritative stage history record
 * when an application is submitted to a job.
 */
export async function assignInitialStageToApplication(
  jobId: number,
  applicationId: number,
  userId?: number
): Promise<{ success: boolean; currentStageId?: number }> {
  try {
    const pipeline = await getJobPipeline(jobId);
    if (!pipeline?.stages || pipeline.stages.length === 0) {
      throw new Error(`Failed to resolve pipeline for job #${jobId}`);
    }

    const appliedStage =
      pipeline.stages.find((s) => s.stage_type === "APPLIED") ?? pipeline.stages[0];

    const nowUtc = new Date().toISOString();

    // 1. Update application with current_stage_id and canonical status
    await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${applicationId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        current_stage_id: appliedStage.id,
        application_status: "APPLIED",
        status_updated_at: nowUtc,
      }),
    });

    // 2. Insert authoritative audit record into vs_application_stage_history
    await fetch(`${DIRECTUS_BASE}/items/vs_application_stage_history`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        application_id: applicationId,
        from_stage_id: null,
        to_stage_id: appliedStage.id,
        changed_by: userId ?? null,
        change_reason: "Initial Application Submission",
        metadata: {
          job_pipeline_id: pipeline.id,
          stage_name: appliedStage.stage_name,
          stage_type: appliedStage.stage_type,
        },
        created_at: nowUtc,
      }),
    });

    return { success: true, currentStageId: appliedStage.id };
  } catch (err) {
    console.error("[job-pipeline.service] assignInitialStageToApplication error:", err);
    return { success: false };
  }
}

interface StageMoveContext {
  appData: Record<string, unknown>;
  pipeline: JobPipelineVersion;
  fromStage: JobPipelineStage;
  toStage: JobPipelineStage;
  hasConfiguredTransition: boolean;
  isUniversalExit: boolean;
}

type StageMoveResolution =
  | { ok: true; context: StageMoveContext }
  | { ok: false; error: string; statusCode: number };

/**
 * Resolves the endpoints of a stage move against the job's active pipeline
 * and classifies the route as a configured transition or a universal
 * REJECTED/WITHDRAWN exit. Shared by the move itself and the assessment
 * move-time pre-check.
 */
async function resolveStageMoveContext(
  applicationId: number,
  toStageId: number
): Promise<StageMoveResolution> {
  // 1. Fetch application
  const appRes = await fetch(
    `${DIRECTUS_BASE}/items/vs_job_application/${applicationId}?fields=application_id,job_id,user_id,application_status,current_stage_id,client_notes`,
    { headers: getHeaders(), cache: "no-store" }
  );
  if (!appRes.ok) {
    return { ok: false, error: "Application not found.", statusCode: 404 };
  }
  const appJson = await appRes.json();
  const appData = appJson.data;
  if (!appData) {
    return { ok: false, error: "Application not found.", statusCode: 404 };
  }

  const jobId = Number(appData.job_id);
  if (!jobId) {
    return { ok: false, error: "Application is not associated with a valid job.", statusCode: 400 };
  }

  // 2. Fetch active job pipeline version
  const pipeline = await getJobPipeline(jobId);
  if (!pipeline || !pipeline.stages || pipeline.stages.length === 0) {
    return { ok: false, error: "Job pipeline not found or has no stages.", statusCode: 500 };
  }

  const stages = pipeline.stages;
  const transitions = pipeline.transitions ?? [];

  // 3. Resolve fromStage
  const unresolvedFrom = appData.current_stage_id
    ? stages.find((s) => s.id === Number(appData.current_stage_id))
    : undefined;
  const canonicalStatus = (appData.application_status || "APPLIED").toUpperCase();
  const fromStage =
    unresolvedFrom ||
    stages.find((s) => s.stage_type === canonicalStatus) ||
    stages.find((s) => s.stage_type === "APPLIED") ||
    stages[0];

  if (!fromStage) {
    return { ok: false, error: "Could not resolve candidate current stage in this pipeline.", statusCode: 422 };
  }

  // 4. Resolve toStage (Must belong to the same pipeline version!)
  const toStage = stages.find((s) => s.id === Number(toStageId));
  if (!toStage) {
    return {
      ok: false,
      error: `Target stage #${toStageId} does not belong to this job's active pipeline.`,
      statusCode: 422,
    };
  }

  // Transition classification:
  // Either explicit transition exists, OR target is a Universal Exit (REJECTED / WITHDRAWN) from non-terminal stage
  const hasConfiguredTransition = transitions.some(
    (t) => t.from_stage_id === fromStage.id && t.to_stage_id === toStage.id
  );
  const isUniversalExit = toStage.stage_type === "REJECTED" || toStage.stage_type === "WITHDRAWN";

  return {
    ok: true,
    context: { appData, pipeline, fromStage, toStage, hasConfiguredTransition, isUniversalExit },
  };
}

export interface AssessmentMoveRequirement {
  requiresOutcome: boolean;
  fromStage?: JobPipelineStage;
  toStage?: JobPipelineStage;
  error?: string;
  statusCode?: number;
}

/**
 * Move-time pre-check for the client confirm flow: reports whether moving
 * the application to `toStageId` qualifies for the assessment outcome gate
 * (task-bearing ASSESSMENT stage, configured non-universal route). Never
 * writes; the PATCH remains authoritative.
 */
export async function getAssessmentMoveRequirement(input: {
  applicationId: number;
  toStageId: number;
}): Promise<AssessmentMoveRequirement> {
  try {
    const resolved = await resolveStageMoveContext(input.applicationId, input.toStageId);
    if (!resolved.ok) {
      return { requiresOutcome: false, error: resolved.error, statusCode: resolved.statusCode };
    }
    const { fromStage, toStage, hasConfiguredTransition, isUniversalExit } = resolved.context;

    if (fromStage.id === toStage.id) {
      return { requiresOutcome: false, fromStage, toStage };
    }
    if (fromStage.is_terminal) {
      return {
        requiresOutcome: false,
        error: `Candidate is in terminal stage "${fromStage.stage_name}" and cannot be transitioned further.`,
        statusCode: 422,
      };
    }
    if (!hasConfiguredTransition && !isUniversalExit) {
      return {
        requiresOutcome: false,
        error: `Transition from "${fromStage.stage_name}" to "${toStage.stage_name}" is not configured in this job's pipeline.`,
        statusCode: 422,
      };
    }

    const qualifying = await isQualifyingAssessmentMove({
      fromStage,
      isUniversalExit,
      hasConfiguredTransition,
    });
    return { requiresOutcome: qualifying, fromStage, toStage };
  } catch (err) {
    console.error("[job-pipeline.service] getAssessmentMoveRequirement error:", err);
    return {
      requiresOutcome: false,
      error: err instanceof Error ? err.message : "Internal error checking assessment requirement.",
      statusCode: 500,
    };
  }
}

export interface TransitionStageParams {
  applicationId: number;
  toStageId: number;
  changedByUserId?: number | null;
  changeReason?: string | null;
  notes?: string | null;
  assessmentOutcome?: string | null;
}

export interface TransitionStageResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  noop?: boolean;
  moved?: boolean;
  outcome?: "PASS" | "FAIL" | null;
  application?: Record<string, unknown>;
  fromStage?: JobPipelineStage;
  toStage?: JobPipelineStage;
}

async function hasStageTasks(stageId: number): Promise<boolean> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_job_pipeline_assessment_tasks?filter[job_stage_id][_eq]=${stageId}&fields=id&limit=1`,
      { headers: getHeaders(), cache: "no-store" },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.data) && json.data.length > 0;
  } catch {
    return false;
  }
}

async function hasAssessmentAssignedEvent(applicationId: number): Promise<boolean> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_notification_event?filter[event_type][_eq]=ASSESSMENT_ASSIGNED&filter[entity_type][_eq]=job_application&filter[entity_id][_eq]=${applicationId}&fields=event_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.data) && json.data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Best-effort arrival notification for a move INTO an ASSESSMENT stage.
 * Sends only to the application's freelancer (never the acting client),
 * only when the stage carries a submission window and at least one task,
 * and only once per application (existing ASSESSMENT_ASSIGNED event skips).
 * Never throws; notification failure must not fail the stage move.
 */
async function notifyFreelancerOfAssessmentAssignment(input: {
  applicationId: number;
  freelancerUserId: number;
  actingUserId?: number | null;
  toStage: JobPipelineStage;
  entryTime: string;
}): Promise<void> {
  try {
    const freelancerId = input.freelancerUserId;
    if (!Number.isSafeInteger(freelancerId) || freelancerId <= 0) return;
    if (input.actingUserId !== null && input.actingUserId !== undefined && freelancerId === input.actingUserId) return;
    const windowDays = parseWindowDays(input.toStage.assessment_submission_window_days);
    if (windowDays === null) return;
    if (!(await hasStageTasks(input.toStage.id))) return;
    if (await hasAssessmentAssignedEvent(input.applicationId)) return;
    const deadline = deriveAssessmentDeadline(input.entryTime, windowDays);
    if (!deadline) return;
    const formatted = formatDateLong(new Date(deadline));
    await createNotification({
      event_type: "ASSESSMENT_ASSIGNED",
      recipient_user_id: freelancerId,
      entity_type: "job_application",
      entity_id: input.applicationId,
      category: "ASSESSMENT_ASSIGNED",
      title: "Assessment assigned",
      message: `You have until ${formatted} to complete your assessment.`,
      action_url: `/vos-sync/freelancer/applications?assessment=${input.applicationId}`,
    }).catch((error: unknown) => console.error("[job-pipeline.service] assessment arrival notify error:", error));
  } catch (error) {
    console.error("[job-pipeline.service] assessment arrival notification failed:", error);
  }
}

/**
 * Best-effort move-time assessment outcome notification to the freelancer.
 * Exactly once per decision: PASS -> ASSESSMENT_PASSED, FAIL ->
 * ASSESSMENT_FAILED. Mirrors the ASSESSMENT_ASSIGNED idempotency (existing
 * event type + entity check). Never notifies the acting client. Never
 * throws; notification failure must not fail the stage move.
 */
async function hasAssessmentOutcomeEvent(
  applicationId: number,
  eventType: "ASSESSMENT_PASSED" | "ASSESSMENT_FAILED"
): Promise<boolean> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_notification_event?filter[event_type][_eq]=${eventType}&filter[entity_type][_eq]=job_application&filter[entity_id][_eq]=${applicationId}&fields=event_id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.data) && json.data.length > 0;
  } catch {
    return false;
  }
}

export async function notifyFreelancerOfAssessmentOutcome(input: {
  applicationId: number;
  freelancerUserId: number;
  actingUserId?: number | null;
  fromStageName: string;
  outcome: "PASS" | "FAIL";
}): Promise<void> {
  try {
    const freelancerId = input.freelancerUserId;
    if (!Number.isSafeInteger(freelancerId) || freelancerId <= 0) return;
    if (input.actingUserId !== null && input.actingUserId !== undefined && freelancerId === input.actingUserId) return;
    const eventType = input.outcome === "PASS" ? "ASSESSMENT_PASSED" : "ASSESSMENT_FAILED";
    if (await hasAssessmentOutcomeEvent(input.applicationId, eventType)) return;
    const passed = input.outcome === "PASS";
    await createNotification({
      event_type: eventType,
      recipient_user_id: freelancerId,
      entity_type: "job_application",
      entity_id: input.applicationId,
      category: eventType,
      title: passed ? "Assessment passed" : "Assessment not passed",
      message: passed
        ? `Your assessment for "${input.fromStageName}" was marked as passed.`
        : `Your assessment for "${input.fromStageName}" was marked as failed.`,
      action_url: `/vos-sync/freelancer/applications?assessment=${input.applicationId}`,
    }).catch((error: unknown) => console.error("[job-pipeline.service] assessment outcome notify error:", error));
  } catch (error) {
    console.error("[job-pipeline.service] assessment outcome notification failed:", error);
  }
}

/**
 * Transitions an application to a new ATS pipeline stage according to authoritative
 * job pipeline rules, configured transitions, universal exits, and audit history.
 */
export async function transitionApplicationStage({
  applicationId,
  toStageId,
  changedByUserId,
  changeReason,
  notes,
  assessmentOutcome,
}: TransitionStageParams): Promise<TransitionStageResult> {
  try {
    const nowPH = getPHTimeString();

    const resolved = await resolveStageMoveContext(applicationId, toStageId);
    if (!resolved.ok) {
      return { success: false, error: resolved.error, statusCode: resolved.statusCode };
    }
    const { appData, pipeline, fromStage, toStage, hasConfiguredTransition, isUniversalExit } =
      resolved.context;

    // 5. Guard: No-op if already in the target stage
    if (fromStage.id === toStage.id) {
      return {
        success: true,
        noop: true,
        application: appData,
        fromStage,
        toStage,
      };
    }

    // 6. Guard: Cannot move OUT of a terminal stage
    if (fromStage.is_terminal) {
      return {
        success: false,
        error: `Candidate is in terminal stage "${fromStage.stage_name}" and cannot be transitioned further.`,
        statusCode: 422,
      };
    }

    // 7. Transition validation: the route must be a configured transition
    // or a universal REJECTED/WITHDRAWN exit (flags resolved above).
    if (!hasConfiguredTransition && !isUniversalExit) {
      return {
        success: false,
        error: `Transition from "${fromStage.stage_name}" to "${toStage.stage_name}" is not configured in this job's pipeline.`,
        statusCode: 422,
      };
    }

    // 7b. ASSESSMENT progression gate: a configured (non-universal) move out
    // of a task-bearing ASSESSMENT stage requires a move-time
    // assessment_outcome. Universal REJECTED/WITHDRAWN exits and task-free
    // stages always pass.
    const gateError = await checkAssessmentGate({
      applicationId,
      fromStage,
      isUniversalExit,
      hasConfiguredTransition,
      assessmentOutcome,
    });
    if (gateError) {
      return { success: false, error: gateError, statusCode: 409 };
    }

    // 7c. Record the move-time outcome on the latest attempt before
    // performing the move. Non-qualifying moves never reach a write here:
    // the gate above rejects a missing outcome, and the qualifying re-check
    // below guards a gratuitous one. FAIL records and STAYS (no transition,
    // no history write); PASS records then moves exactly as before.
    let moveOutcome: "PASS" | "FAIL" | null = null;
    if (isValidAssessmentOutcome(assessmentOutcome)) {
      const qualifying = await isQualifyingAssessmentMove({
        fromStage,
        isUniversalExit,
        hasConfiguredTransition,
      });
      if (qualifying) {
        const recordError = await recordAssessmentMoveOutcome({
          applicationId,
          jobStageId: fromStage.id,
          outcome: assessmentOutcome,
          reviewedBy: changedByUserId ?? null,
        });
        if (recordError) {
          return { success: false, error: recordError, statusCode: 502 };
        }
        moveOutcome = assessmentOutcome;
        if (assessmentOutcome === "FAIL") {
          await notifyFreelancerOfAssessmentOutcome({
            applicationId,
            freelancerUserId: Number(appData.user_id),
            actingUserId: changedByUserId ?? null,
            fromStageName: fromStage.stage_name,
            outcome: "FAIL",
          });
          return {
            success: true,
            moved: false,
            outcome: "FAIL",
            application: appData,
            fromStage,
            toStage: fromStage,
          };
        }
      }
    }

    // 8. Update vs_job_application:
    // Set current_stage_id, application_status (canonical synchronization!), client_notes, status_updated_at
    const dbStatus =
      CANONICAL_TO_LEGACY_STATUS_MAP[toStage.stage_type] ?? toStage.stage_type;

    const patchPayload: Record<string, unknown> = {
      current_stage_id: toStage.id,
      application_status: dbStatus,
      status_updated_at: nowPH,
    };
    if (notes !== undefined && notes !== null) {
      patchPayload.client_notes = notes;
    }

    const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_job_application/${applicationId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(patchPayload),
    });
    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error("[job-pipeline.service] Failed to update application current_stage_id:", errText);
      return { success: false, error: "Failed to update application stage.", statusCode: 500 };
    }
    const updatedAppJson = await patchRes.json();

    // 9. Write audit record into vs_application_stage_history
    const reason = notes || changeReason || `Moved from "${fromStage.stage_name}" to "${toStage.stage_name}"`;
    await fetch(`${DIRECTUS_BASE}/items/vs_application_stage_history`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        application_id: applicationId,
        from_stage_id: fromStage.id,
        to_stage_id: toStage.id,
        changed_by: changedByUserId ?? null,
        change_reason: reason,
        metadata: {
          from_stage_name: fromStage.stage_name,
          to_stage_name: toStage.stage_name,
          from_stage_type: fromStage.stage_type,
          to_stage_type: toStage.stage_type,
          job_pipeline_id: pipeline.id,
        },
        created_at: nowPH,
      }),
    });

    // 10. Arrival notification: the history row above is the stage-entry
    // timestamp, so the deadline derives from the same nowPH instant.
    if (toStage.stage_type === "ASSESSMENT") {
      await notifyFreelancerOfAssessmentAssignment({
        applicationId,
        freelancerUserId: Number(appData.user_id),
        actingUserId: changedByUserId ?? null,
        toStage,
        entryTime: nowPH,
      });
    }

    if (moveOutcome === "PASS") {
      await notifyFreelancerOfAssessmentOutcome({
        applicationId,
        freelancerUserId: Number(appData.user_id),
        actingUserId: changedByUserId ?? null,
        fromStageName: fromStage.stage_name,
        outcome: "PASS",
      });
    }

    return {
      success: true,
      moved: true,
      outcome: moveOutcome,
      application: updatedAppJson.data ?? { ...appData, ...patchPayload },
      fromStage,
      toStage,
    };
  } catch (err) {
    console.error("[job-pipeline.service] transitionApplicationStage error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Internal error transitioning application stage.",
      statusCode: 500,
    };
  }
}

