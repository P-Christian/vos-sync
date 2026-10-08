// Shared assessment contracts: task + attempt + response types.
// Pure types only. No database, fetch, or filesystem access.

export const ASSESSMENT_TASK_TYPES = [
  "SINGLE_CHOICE",
  "EXTERNAL_TASK",
  "FILE_UPLOAD",
  "TEXT_RESPONSE",
] as const;

export type AssessmentTaskType = (typeof ASSESSMENT_TASK_TYPES)[number];

export interface AssessmentChoiceOption {
  key: string;
  label: string;
}

interface AssessmentTaskBase {
  title: string;
  instructions?: string;
  is_required: boolean;
  sort_order: number;
}

export interface SingleChoiceTask extends AssessmentTaskBase {
  task_type: "SINGLE_CHOICE";
  choice_options: AssessmentChoiceOption[];
  correct_choice_key: string;
}

export interface ExternalTask extends AssessmentTaskBase {
  task_type: "EXTERNAL_TASK";
  external_url: string;
}

export interface FileUploadTask extends AssessmentTaskBase {
  task_type: "FILE_UPLOAD";
}

export interface TextResponseTask extends AssessmentTaskBase {
  task_type: "TEXT_RESPONSE";
  text_max_length: number;
}

export type AssessmentTask =
  | SingleChoiceTask
  | ExternalTask
  | FileUploadTask
  | TextResponseTask;

export type PersistedAttemptStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_REVISION"
  | "PASSED"
  | "FAILED";

export type DerivedAttemptStatus = "NOT_STARTED";

export type AttemptStatus = PersistedAttemptStatus | DerivedAttemptStatus;

export const PERSISTED_ATTEMPT_STATUSES: readonly PersistedAttemptStatus[] = [
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_REVISION",
  "PASSED",
  "FAILED",
] as const;

export const IMMUTABLE_ATTEMPT_STATUSES: readonly PersistedAttemptStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "PASSED",
  "FAILED",
  "NEEDS_REVISION",
] as const;

export type AttemptAction =
  | "SAVE_DRAFT"
  | "SUBMIT"
  | "BEGIN_REVIEW"
  | "MARK_PASSED"
  | "MARK_FAILED"
  | "REQUEST_REVISION";

export type ReviewDecision = "PASSED" | "FAILED" | "NEEDS_REVISION";

export interface AssessmentAttempt {
  id: number;
  application_id: number;
  job_stage_id: number;
  attempt_number: number;
  predecessor_attempt_id: number | null;
  status: PersistedAttemptStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
  review_notes: string | null;
}

export type AttemptStatusView =
  | { status: DerivedAttemptStatus; attempt: null }
  | { status: PersistedAttemptStatus; attempt: AssessmentAttempt };

export interface SingleChoiceResponse {
  task_type: "SINGLE_CHOICE";
  selected_choice_key: string;
}

export interface ExternalTaskResponse {
  task_type: "EXTERNAL_TASK";
  response_text: string;
}

export interface FileUploadResponse {
  task_type: "FILE_UPLOAD";
  proof_file_id: string;
  proof_file_name: string | null;
}

export interface TextTaskResponse {
  task_type: "TEXT_RESPONSE";
  response_text: string;
}

export type AssessmentTaskResponse =
  | SingleChoiceResponse
  | ExternalTaskResponse
  | FileUploadResponse
  | TextTaskResponse;

export type AssessmentTaskEmployerDTO = AssessmentTask;

export interface FreelancerSingleChoiceTask extends AssessmentTaskBase {
  task_type: "SINGLE_CHOICE";
  choice_options: AssessmentChoiceOption[];
}

export interface FreelancerExternalTask extends AssessmentTaskBase {
  task_type: "EXTERNAL_TASK";
  external_url: string;
}

export interface FreelancerFileUploadTask extends AssessmentTaskBase {
  task_type: "FILE_UPLOAD";
}

export interface FreelancerTextResponseTask extends AssessmentTaskBase {
  task_type: "TEXT_RESPONSE";
  text_max_length: number;
}

export type AssessmentTaskFreelancerDTO =
  | FreelancerSingleChoiceTask
  | FreelancerExternalTask
  | FreelancerFileUploadTask
  | FreelancerTextResponseTask;

export type AssessmentAttemptDTO = AssessmentAttempt;

export type AssessmentResponseDTO = AssessmentTaskResponse;

export const DEFAULT_TEXT_MAX_LENGTH = 4000;
export const TEXT_MAX_LENGTH_HARD_CAP = 20000;
