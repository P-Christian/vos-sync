// src/modules/client/pipeline/components/assessment-task-editor/task-submit.ts
// Payload builders: form state -> shared create input, and create input ->
// shared update input (create shape minus server-owned `sort_order`).

import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "@/modules/shared/assessment";
import type { TaskFormState } from "./task-form-state";

export function buildCreateInput(
  state: TaskFormState,
  sortOrder: number
): CreateTaskInput {
  const base = {
    title: state.title.trim(),
    instructions: state.instructions.trim()
      ? state.instructions.trim()
      : undefined,
    is_required: state.is_required,
    sort_order: sortOrder,
  };
  switch (state.task_type) {
    case "SINGLE_CHOICE":
      return {
        ...base,
        task_type: "SINGLE_CHOICE",
        choice_options: state.options.map((option) => ({
          key: option.key.trim(),
          label: option.label.trim(),
        })),
        correct_choice_key: state.correct_choice_key.trim(),
      };
    case "EXTERNAL_TASK":
      return {
        ...base,
        task_type: "EXTERNAL_TASK",
        external_url: state.external_url.trim(),
      };
    case "FILE_UPLOAD":
      return { ...base, task_type: "FILE_UPLOAD" };
    case "TEXT_RESPONSE":
      return {
        ...base,
        task_type: "TEXT_RESPONSE",
        text_max_length: Number(state.text_max_length.trim()),
      };
  }
}

export function toUpdateInput(input: CreateTaskInput): UpdateTaskInput {
  switch (input.task_type) {
    case "SINGLE_CHOICE":
      return {
        task_type: "SINGLE_CHOICE",
        title: input.title,
        instructions: input.instructions,
        is_required: input.is_required,
        choice_options: input.choice_options,
        correct_choice_key: input.correct_choice_key,
      };
    case "EXTERNAL_TASK":
      return {
        task_type: "EXTERNAL_TASK",
        title: input.title,
        instructions: input.instructions,
        is_required: input.is_required,
        external_url: input.external_url,
      };
    case "FILE_UPLOAD":
      return {
        task_type: "FILE_UPLOAD",
        title: input.title,
        instructions: input.instructions,
        is_required: input.is_required,
      };
    case "TEXT_RESPONSE":
      return {
        task_type: "TEXT_RESPONSE",
        title: input.title,
        instructions: input.instructions,
        is_required: input.is_required,
        text_max_length: input.text_max_length,
      };
  }
}
