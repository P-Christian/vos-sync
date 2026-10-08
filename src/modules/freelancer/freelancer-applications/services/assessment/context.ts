// Ownership-checked application loading + active assessment context
// resolution for the freelancer assessment APIs.

import { getJobPipeline } from "@/modules/client/pipeline/services/job-pipeline.service";
import { directusGetOne } from "./directus";
import { fetchStageTasks, toSnapshotTask, type JobTaskRow, type SnapshotTask } from "./snapshot";

const APPLICATION_FIELDS = "application_id,job_id,user_id,current_stage_id";

export interface OwnedApplication {
  application_id: number;
  job_id: number;
  user_id: number;
  current_stage_id: number | null;
}

/**
 * Loads the application and enforces freelancer ownership. Returns null when
 * the row is missing or owned by someone else, so existence is not leaked.
 */
export async function loadOwnedApplication(
  applicationId: number,
  freelancerUserId: string | number,
): Promise<OwnedApplication | null> {
  const raw = await directusGetOne("vs_job_application", applicationId, APPLICATION_FIELDS);
  if (!raw) return null;
  const ownerId = Number(raw.user_id);
  if (!Number.isSafeInteger(ownerId) || ownerId !== Number(freelancerUserId)) return null;
  const jobId = Number(raw.job_id);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) return null;
  const stageValue = raw.current_stage_id;
  const stageId = stageValue === null || stageValue === undefined ? null : Number(stageValue);
  return {
    application_id: Number(raw.application_id),
    job_id: jobId,
    user_id: ownerId,
    current_stage_id: stageId !== null && Number.isSafeInteger(stageId) && stageId > 0 ? stageId : null,
  };
}

export interface ActiveAssessmentContext {
  kind: "active";
  application: OwnedApplication;
  stageId: number;
  rows: JobTaskRow[];
  tasks: SnapshotTask[];
  taskById: Map<number, SnapshotTask>;
  rowById: Map<number, JobTaskRow>;
}

export type AssessmentContext = ActiveAssessmentContext | { kind: "empty" };

/**
 * Resolves the current assessment context from the active job pipeline and
 * the application's current stage. Non-ASSESSMENT stages (or a missing
 * stage/pipeline) yield an empty context: reads return no tasks and writes
 * are rejected with 409 by the routes.
 */
export async function resolveAssessmentContext(
  application: OwnedApplication,
): Promise<AssessmentContext> {
  if (application.current_stage_id === null) return { kind: "empty" };
  const pipeline = await getJobPipeline(application.job_id);
  const stage = pipeline?.stages?.find((entry) => entry.id === application.current_stage_id);
  if (!stage || stage.stage_type !== "ASSESSMENT") return { kind: "empty" };
  const rows = await fetchStageTasks(stage.id);
  const tasks = rows.map(toSnapshotTask);
  const taskById = new Map<number, SnapshotTask>();
  const rowById = new Map<number, JobTaskRow>();
  rows.forEach((row, index) => {
    taskById.set(row.id, tasks[index]);
    rowById.set(row.id, row);
  });
  return { kind: "active", application, stageId: stage.id, rows, tasks, taskById, rowById };
}
