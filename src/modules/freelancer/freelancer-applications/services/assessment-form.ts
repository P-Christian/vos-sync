// src/modules/freelancer/freelancer-applications/services/assessment-form.ts
// Pure derivation + validation helpers for the freelancer assessment dialog.
// No I/O: all rules mirror src/modules/shared/assessment/schemas.ts so the
// client surfaces the same problems the server would return as 422.

import type { AttemptStatus } from "@/modules/shared/assessment";
import type {
  ApplicationAssessmentSummary,
  AssessmentFieldValues,
  AssessmentIssue,
  AssessmentView,
} from "../types/assessment";

export interface AssessmentDraftEntry {
  job_task_id: number;
  task_type: "SINGLE_CHOICE" | "TEXT_RESPONSE" | "EXTERNAL_TASK" | "FILE_UPLOAD";
  selected_choice_key?: string;
  response_text?: string;
}

export function isEditableStatus(status: AttemptStatus): boolean {
  return status === "NOT_STARTED" || status === "IN_PROGRESS";
}

export function buildFieldValues(view: AssessmentView): AssessmentFieldValues {
  const stored = new Map(view.responses.map((response) => [response.job_task_id, response]));
  const values: AssessmentFieldValues = {};
  for (const { job_task_id, task } of view.tasks) {
    const response = stored.get(job_task_id);
    switch (task.task_type) {
      case "SINGLE_CHOICE":
        values[job_task_id] = {
          task_type: "SINGLE_CHOICE",
          selected_choice_key: response?.selected_choice_key ?? "",
        };
        break;
      case "TEXT_RESPONSE":
        values[job_task_id] = {
          task_type: "TEXT_RESPONSE",
          response_text: response?.response_text ?? "",
        };
        break;
      case "EXTERNAL_TASK":
        values[job_task_id] = {
          task_type: "EXTERNAL_TASK",
          response_text: response?.response_text ?? "",
        };
        break;
      case "FILE_UPLOAD":
        values[job_task_id] = {
          task_type: "FILE_UPLOAD",
          proof_file_id: response?.proof_file_id ?? null,
          proof_file_name: response?.proof_file_name ?? null,
        };
        break;
      default: {
        const unreachable: never = task;
        throw new Error(`Unhandled assessment task type: ${JSON.stringify(unreachable)}`);
      }
    }
  }
  return values;
}

/**
 * Draft saves are partial-friendly: only tasks with something meaningful to
 * persist are sent. Proof files persist through the dedicated upload endpoint.
 */
export function buildDraftEntries(
  view: AssessmentView,
  values: AssessmentFieldValues,
): AssessmentDraftEntry[] {
  const stored = new Map(view.responses.map((response) => [response.job_task_id, response]));
  const entries: AssessmentDraftEntry[] = [];
  for (const { job_task_id, task } of view.tasks) {
    const value = values[job_task_id];
    if (!value || value.task_type !== task.task_type) continue;
    switch (value.task_type) {
      case "SINGLE_CHOICE":
        if (value.selected_choice_key !== "") {
          entries.push({
            job_task_id,
            task_type: "SINGLE_CHOICE",
            selected_choice_key: value.selected_choice_key,
          });
        }
        break;
      case "TEXT_RESPONSE":
      case "EXTERNAL_TASK": {
        const hadText = (stored.get(job_task_id)?.response_text ?? "") !== "";
        if (value.response_text !== "" || hadText) {
          entries.push({
            job_task_id,
            task_type: value.task_type,
            response_text: value.response_text,
          });
        }
        break;
      }
      case "FILE_UPLOAD":
        break;
      default: {
        const unreachable: never = value;
        throw new Error(`Unhandled assessment field value: ${JSON.stringify(unreachable)}`);
      }
    }
  }
  return entries;
}

export function validateForSubmit(
  view: AssessmentView,
  values: AssessmentFieldValues,
): AssessmentIssue[] {
  const issues: AssessmentIssue[] = [];
  for (const { job_task_id, task } of view.tasks) {
    const value = values[job_task_id];
    switch (task.task_type) {
      case "SINGLE_CHOICE": {
        const selected =
          value && value.task_type === "SINGLE_CHOICE" ? value.selected_choice_key : "";
        const valid = task.choice_options.some((option) => option.key === selected);
        if (!valid && (task.is_required || selected !== "")) {
          issues.push({
            job_task_id,
            message: "Select one of the available options.",
          });
        }
        break;
      }
      case "TEXT_RESPONSE": {
        const text = value && value.task_type === "TEXT_RESPONSE" ? value.response_text : "";
        if (task.is_required && text.trim() === "") {
          issues.push({ job_task_id, message: "A response is required before you can submit." });
        } else if (text.length > task.text_max_length) {
          issues.push({
            job_task_id,
            message: `Response exceeds the ${task.text_max_length} character limit.`,
          });
        }
        break;
      }
      case "EXTERNAL_TASK": {
        const text = value && value.task_type === "EXTERNAL_TASK" ? value.response_text : "";
        if (task.is_required && text.trim() === "") {
          issues.push({
            job_task_id,
            message: "Add a completion note or result link before you can submit.",
          });
        }
        break;
      }
      case "FILE_UPLOAD": {
        const proofId = value && value.task_type === "FILE_UPLOAD" ? value.proof_file_id : null;
        if (task.is_required && !proofId) {
          issues.push({ job_task_id, message: "Upload the required file before you can submit." });
        }
        break;
      }
      default: {
        const unreachable: never = task;
        throw new Error(`Unhandled assessment task type: ${JSON.stringify(unreachable)}`);
      }
    }
  }
  return issues;
}

export function summarizeView(view: AssessmentView): ApplicationAssessmentSummary {
  return {
    available: view.tasks.length > 0,
    status: view.status,
    attempt_number: view.attempt?.attempt_number ?? null,
    deadline: view.deadline ?? null,
  };
}

export function assessmentActionLabel(status: AttemptStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Take Assessment";
    case "IN_PROGRESS":
    case "NEEDS_REVISION":
      return "Continue Assessment";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "View Assessment";
    case "PASSED":
    case "FAILED":
      return "View Assessment Result";
    default: {
      const unreachable: never = status;
      throw new Error(`Unhandled attempt status: ${JSON.stringify(unreachable)}`);
    }
  }
}
