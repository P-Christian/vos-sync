// src/modules/client/pipeline/components/assessment-task-editor/task-form-state.ts
// Form-state model for the task create/edit form: drafts, blank defaults,
// and hydration from a persisted row.

import type { CompanyAssessmentTaskRow } from "../../services/assessment-task.service";
import type { AssessmentTaskType } from "@/modules/shared/assessment";

export interface OptionDraft {
  key: string;
  label: string;
}

export interface TaskFormState {
  task_type: AssessmentTaskType;
  title: string;
  instructions: string;
  is_required: boolean;
  options: OptionDraft[];
  correct_choice_key: string;
  external_url: string;
  text_max_length: string;
}

export function blankFormState(): TaskFormState {
  return {
    task_type: "SINGLE_CHOICE",
    title: "",
    instructions: "",
    is_required: true,
    options: [
      { key: "A", label: "" },
      { key: "B", label: "" },
    ],
    correct_choice_key: "A",
    external_url: "",
    text_max_length: "4000",
  };
}

export function formStateFromTask(
  task: CompanyAssessmentTaskRow
): TaskFormState {
  const base = {
    title: task.title,
    instructions: task.instructions ?? "",
    is_required: task.is_required,
  };
  switch (task.task_type) {
    case "SINGLE_CHOICE":
      return {
        ...base,
        task_type: "SINGLE_CHOICE",
        options: (task.choice_options ?? []).map((o) => ({
          key: o.key,
          label: o.label,
        })),
        correct_choice_key: task.correct_choice_key ?? "",
        external_url: "",
        text_max_length: "4000",
      };
    case "EXTERNAL_TASK":
      return {
        ...base,
        task_type: "EXTERNAL_TASK",
        options: [],
        correct_choice_key: "",
        external_url: task.external_url ?? "",
        text_max_length: "4000",
      };
    case "FILE_UPLOAD":
      return {
        ...base,
        task_type: "FILE_UPLOAD",
        options: [],
        correct_choice_key: "",
        external_url: "",
        text_max_length: "4000",
      };
    case "TEXT_RESPONSE":
      return {
        ...base,
        task_type: "TEXT_RESPONSE",
        options: [],
        correct_choice_key: "",
        external_url: "",
        text_max_length: String(task.text_max_length ?? 4000),
      };
  }
}
