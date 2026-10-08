// Read-only assembly of the freelancer assessment view.
// This module performs ZERO writes: it only loads the frozen tasks, the
// latest attempt, and that attempt's responses.

import {
  deriveAttemptStatus,
  toAttemptDTO,
  toFreelancerTaskDTO,
  type AssessmentAttemptDTO,
  type AssessmentTaskFreelancerDTO,
  type AssessmentTaskType,
  type AttemptStatus,
} from "@/modules/shared/assessment";
import type { ActiveAssessmentContext } from "./context";
import { asValidatableTask } from "./snapshot";
import { loadLatestAttempt, loadResponseRows, type AttemptRow, type ResponseRow } from "./store";

export interface FreelancerTaskView {
  job_task_id: number;
  task: AssessmentTaskFreelancerDTO;
}

export interface FreelancerResponseView {
  job_task_id: number;
  task_type: AssessmentTaskType;
  selected_choice_key: string | null;
  response_text: string | null;
  proof_file_id: string | null;
  proof_file_name: string | null;
}

export interface AssessmentReadModel {
  application_id: number;
  stage_id: number;
  status: AttemptStatus;
  attempt: AssessmentAttemptDTO | null;
  tasks: FreelancerTaskView[];
  responses: FreelancerResponseView[];
}

export function toResponseView(row: ResponseRow, taskType: AssessmentTaskType): FreelancerResponseView {
  return {
    job_task_id: row.job_task_id,
    task_type: taskType,
    selected_choice_key: row.selected_choice_key,
    response_text: row.response_text,
    proof_file_id: row.proof_file_id,
    proof_file_name: row.proof_file_name,
  };
}

export function assembleReadModel(
  context: ActiveAssessmentContext,
  attempt: AttemptRow | null,
  rows: ResponseRow[],
): AssessmentReadModel {
  const tasks: FreelancerTaskView[] = context.rows.map((row, index) => ({
    job_task_id: row.id,
    task: toFreelancerTaskDTO(asValidatableTask(context.tasks[index])),
  }));
  const responses: FreelancerResponseView[] = [];
  for (const row of rows) {
    const snapshot = context.taskById.get(row.job_task_id);
    if (!snapshot) continue;
    responses.push(toResponseView(row, snapshot.task_type));
  }
  return {
    application_id: context.application.application_id,
    stage_id: context.stageId,
    status: deriveAttemptStatus(attempt),
    attempt: attempt ? toAttemptDTO(attempt) : null,
    tasks,
    responses,
  };
}

export async function readAssessment(context: ActiveAssessmentContext): Promise<AssessmentReadModel> {
  const attempt = await loadLatestAttempt(
    context.application.application_id,
    context.stageId,
  );
  const rows = attempt ? await loadResponseRows(attempt.id) : [];
  return assembleReadModel(context, attempt, rows);
}
