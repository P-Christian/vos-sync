// Employer assessment-review context: company-scoped application loading,
// assessment-stage resolution, and frozen task loading (employer view keeps
// correct_choice_key). Never trusts a client-supplied company id.

import { getJobPipeline } from "@/modules/client/pipeline/services/job-pipeline.service";
import {
  toEmployerTaskDTO,
  type AssessmentTaskEmployerDTO,
  type AssessmentTaskType,
} from "@/modules/shared/assessment";
import { directusGetOne, directusList } from "./directus";

const APPLICATION_FIELDS = "application_id,job_id,user_id,current_stage_id";

export interface CompanyApplication {
  application_id: number;
  job_id: number;
  user_id: number;
  current_stage_id: number | null;
}

export interface EmployerTaskView {
  job_task_id: number;
  task: AssessmentTaskEmployerDTO;
}

export interface ActiveReviewContext {
  kind: "active";
  application: CompanyApplication;
  stageId: number;
  tasks: EmployerTaskView[];
}

export type ReviewContext = ActiveReviewContext | { kind: "empty" };

/** One ASSESSMENT stage of the job with its frozen employer task view. */
export interface AssessmentStageTasks {
  stageId: number;
  stageName: string;
  stageOrder: number;
  tasks: EmployerTaskView[];
}

/** All ASSESSMENT stages of the job (pipeline order) for history reads. */
export interface AssessmentHistoryContext {
  stages: AssessmentStageTasks[];
}

export async function resolveReviewerCompany(
  userId: string | number,
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      "filter[user_id][_eq]": String(userId),
      fields: "company_id",
      limit: "1",
    });
    const rows = await directusList("vs_company_user", params);
    const raw = rows[0]?.company_id ?? null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Loads the application and verifies the application's job belongs to the
 * reviewer's company. Returns null when missing or out of scope so existence
 * is not leaked across companies.
 */
export async function loadCompanyApplication(
  applicationId: number,
  companyId: number,
): Promise<CompanyApplication | null> {
  const raw = await directusGetOne("vs_job_application", applicationId, APPLICATION_FIELDS);
  if (!raw) return null;
  const jobId = Number(raw.job_id);
  if (!Number.isSafeInteger(jobId) || jobId <= 0) return null;
  const job = await directusGetOne("vs_job_posting", jobId, "job_id,company_id");
  if (!job) return null;
  if (Number(job.company_id) !== companyId) return null;
  const stageValue = raw.current_stage_id;
  const stageId =
    stageValue === null || stageValue === undefined ? null : Number(stageValue);
  return {
    application_id: Number(raw.application_id),
    job_id: jobId,
    user_id: Number(raw.user_id),
    current_stage_id:
      stageId !== null && Number.isSafeInteger(stageId) && stageId > 0 ? stageId : null,
  };
}

function isTaskType(value: unknown): value is AssessmentTaskType {
  return (
    value === "SINGLE_CHOICE" ||
    value === "EXTERNAL_TASK" ||
    value === "FILE_UPLOAD" ||
    value === "TEXT_RESPONSE"
  );
}

interface RawTaskRow extends Record<string, unknown> {
  id: number;
}

async function loadEmployerTasks(stageId: number): Promise<EmployerTaskView[]> {
  const params = new URLSearchParams({
    "filter[job_stage_id][_eq]": String(stageId),
    fields: [
      "id",
      "job_stage_id",
      "task_type",
      "title",
      "instructions",
      "is_required",
      "sort_order",
      "choice_options",
      "correct_choice_key",
      "external_url",
      "text_max_length",
    ].join(","),
    "sort[]": "sort_order",
    limit: "-1",
  });
  const rows = (await directusList(
    "vs_job_pipeline_assessment_tasks",
    params,
  )) as RawTaskRow[];
  const tasks: EmployerTaskView[] = [];
  for (const raw of rows) {
    if (!isTaskType(raw.task_type)) continue;
    const candidate = {
      task_type: raw.task_type,
      title: String(raw.title ?? ""),
      instructions: typeof raw.instructions === "string" ? raw.instructions : undefined,
      is_required: raw.is_required === true || raw.is_required === 1,
      sort_order: Number(raw.sort_order ?? 0),
      choice_options: Array.isArray(raw.choice_options) ? raw.choice_options : [],
      correct_choice_key: typeof raw.correct_choice_key === "string" ? raw.correct_choice_key : "",
      external_url: typeof raw.external_url === "string" ? raw.external_url : "",
      text_max_length: typeof raw.text_max_length === "number" ? raw.text_max_length : 4000,
    };
    tasks.push({
      job_task_id: Number(raw.id),
      task: toEmployerTaskDTO(
        candidate as Parameters<typeof toEmployerTaskDTO>[0],
      ),
    });
  }
  tasks.sort((a, b) => a.task.sort_order - b.task.sort_order);
  return tasks;
}

export async function resolveReviewContext(
  application: CompanyApplication,
): Promise<ReviewContext> {
  if (application.current_stage_id === null) return { kind: "empty" };
  const pipeline = await getJobPipeline(application.job_id);
  const stage = pipeline?.stages?.find((entry) => entry.id === application.current_stage_id);
  if (!stage || stage.stage_type !== "ASSESSMENT") return { kind: "empty" };
  const tasks = await loadEmployerTasks(stage.id);
  return { kind: "active", application, stageId: stage.id, tasks };
}

export async function resolveAssessmentHistory(
  application: CompanyApplication,
): Promise<AssessmentHistoryContext> {
  const pipeline = await getJobPipeline(application.job_id);
  const assessmentStages = (pipeline?.stages ?? [])
    .filter((entry) => entry.stage_type === "ASSESSMENT")
    .sort((a, b) => a.stage_order - b.stage_order);
  const stages: AssessmentStageTasks[] = [];
  for (const stage of assessmentStages) {
    stages.push({
      stageId: stage.id,
      stageName: stage.stage_name,
      stageOrder: stage.stage_order,
      tasks: await loadEmployerTasks(stage.id),
    });
  }
  return { stages };
}
