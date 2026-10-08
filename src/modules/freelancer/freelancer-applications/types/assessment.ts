// src/modules/freelancer/freelancer-applications/types/assessment.ts
// Freelancer-facing assessment view contracts. These mirror the exact payload
// of GET /api/freelancer/applications/[id]/assessment. The freelancer payload
// never contains an answer key, so no such field exists here by design.

import type {
  AssessmentAttemptDTO,
  AssessmentTaskFreelancerDTO,
  AssessmentTaskType,
  AttemptStatus,
} from "@/modules/shared/assessment";

export interface AssessmentTaskView {
  job_task_id: number;
  task: AssessmentTaskFreelancerDTO;
}

export interface AssessmentResponseView {
  job_task_id: number;
  task_type: AssessmentTaskType;
  selected_choice_key: string | null;
  response_text: string | null;
  proof_file_id: string | null;
  proof_file_name: string | null;
}

export interface AssessmentView {
  application_id: number;
  stage_id: number;
  status: AttemptStatus;
  attempt: AssessmentAttemptDTO | null;
  tasks: AssessmentTaskView[];
  responses: AssessmentResponseView[];
  deadline: string | null;
}

/** Local editable field state, one entry per task. */
export type AssessmentFieldValue =
  | { task_type: "SINGLE_CHOICE"; selected_choice_key: string }
  | { task_type: "TEXT_RESPONSE"; response_text: string }
  | { task_type: "EXTERNAL_TASK"; response_text: string }
  | {
      task_type: "FILE_UPLOAD";
      proof_file_id: string | null;
      proof_file_name: string | null;
    };

export type AssessmentFieldValues = Record<number, AssessmentFieldValue>;

/** Per-task validation issue returned by the server (422) or found locally. */
export interface AssessmentIssue {
  job_task_id: number | null;
  message: string;
}

/** Compact assessment state attached to one applications-table row. */
export interface ApplicationAssessmentSummary {
  available: boolean;
  status: AttemptStatus;
  attempt_number: number | null;
  deadline: string | null;
}

export interface AssessmentMutationResult {
  ok: boolean;
  error?: string;
  issues?: AssessmentIssue[];
}
