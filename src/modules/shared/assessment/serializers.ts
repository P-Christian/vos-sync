// Allow-list serializers for assessment DTOs.
// The freelancer serializer never reads correct_choice_key, so the secret
// is structurally impossible to leak through it.

import type {
  AssessmentAttempt,
  AssessmentAttemptDTO,
  AssessmentResponseDTO,
  AssessmentTask,
  AssessmentTaskEmployerDTO,
  AssessmentTaskFreelancerDTO,
  AssessmentTaskResponse,
} from "./types";

function baseFields(task: AssessmentTask): {
  title: string;
  instructions: string | undefined;
  is_required: boolean;
  sort_order: number;
} {
  return {
    title: task.title,
    instructions: task.instructions,
    is_required: task.is_required,
    sort_order: task.sort_order,
  };
}

export function toEmployerTaskDTO(
  task: AssessmentTask,
): AssessmentTaskEmployerDTO {
  switch (task.task_type) {
    case "SINGLE_CHOICE":
      return {
        ...baseFields(task),
        task_type: "SINGLE_CHOICE",
        choice_options: task.choice_options.map((option) => ({
          key: option.key,
          label: option.label,
        })),
        correct_choice_key: task.correct_choice_key,
      };
    case "EXTERNAL_TASK":
      return {
        ...baseFields(task),
        task_type: "EXTERNAL_TASK",
        external_url: task.external_url,
      };
    case "FILE_UPLOAD":
      return { ...baseFields(task), task_type: "FILE_UPLOAD" };
    case "TEXT_RESPONSE":
      return {
        ...baseFields(task),
        task_type: "TEXT_RESPONSE",
        text_max_length: task.text_max_length,
      };
  }
}

export function toFreelancerTaskDTO(
  task: AssessmentTask,
): AssessmentTaskFreelancerDTO {
  switch (task.task_type) {
    case "SINGLE_CHOICE":
      return {
        title: task.title,
        instructions: task.instructions,
        is_required: task.is_required,
        sort_order: task.sort_order,
        task_type: "SINGLE_CHOICE",
        choice_options: task.choice_options.map((option) => ({
          key: option.key,
          label: option.label,
        })),
      };
    case "EXTERNAL_TASK":
      return {
        title: task.title,
        instructions: task.instructions,
        is_required: task.is_required,
        sort_order: task.sort_order,
        task_type: "EXTERNAL_TASK",
        external_url: task.external_url,
      };
    case "FILE_UPLOAD":
      return {
        title: task.title,
        instructions: task.instructions,
        is_required: task.is_required,
        sort_order: task.sort_order,
        task_type: "FILE_UPLOAD",
      };
    case "TEXT_RESPONSE":
      return {
        title: task.title,
        instructions: task.instructions,
        is_required: task.is_required,
        sort_order: task.sort_order,
        task_type: "TEXT_RESPONSE",
        text_max_length: task.text_max_length,
      };
  }
}

export function toAttemptDTO(attempt: AssessmentAttempt): AssessmentAttemptDTO {
  return {
    id: attempt.id,
    application_id: attempt.application_id,
    job_stage_id: attempt.job_stage_id,
    attempt_number: attempt.attempt_number,
    predecessor_attempt_id: attempt.predecessor_attempt_id,
    status: attempt.status,
    submitted_at: attempt.submitted_at,
    reviewed_at: attempt.reviewed_at,
    reviewed_by: attempt.reviewed_by,
    review_notes: attempt.review_notes,
  };
}

export function toResponseDTO(
  response: AssessmentTaskResponse,
): AssessmentResponseDTO {
  switch (response.task_type) {
    case "SINGLE_CHOICE":
      return {
        task_type: "SINGLE_CHOICE",
        selected_choice_key: response.selected_choice_key,
      };
    case "EXTERNAL_TASK":
      return {
        task_type: "EXTERNAL_TASK",
        response_text: response.response_text,
      };
    case "FILE_UPLOAD":
      return {
        task_type: "FILE_UPLOAD",
        proof_file_id: response.proof_file_id,
        proof_file_name: response.proof_file_name,
      };
    case "TEXT_RESPONSE":
      return {
        task_type: "TEXT_RESPONSE",
        response_text: response.response_text,
      };
  }
}
