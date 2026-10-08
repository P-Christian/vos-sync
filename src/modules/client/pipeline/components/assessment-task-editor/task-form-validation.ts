// src/modules/client/pipeline/components/assessment-task-editor/task-form-validation.ts
// Field-level validation for the task form. Mirrors the shared server
// schemas closely enough for instant feedback; the server remains
// authoritative via `createTaskInputSchema` / `updateTaskInputSchema`.

import type { TaskFormState } from "./task-form-state";

export function validateTaskForm(
  state: TaskFormState
): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = state.title.trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > 255)
    errors.title = "Title must be 255 characters or fewer.";
  if (state.instructions.length > 10000)
    errors.instructions = "Instructions must be 10000 characters or fewer.";

  switch (state.task_type) {
    case "SINGLE_CHOICE": {
      if (state.options.length < 2)
        errors.options = "Add at least two answer options.";
      else if (state.options.length > 20)
        errors.options = "Use at most 20 answer options.";
      const keys = state.options.map((o) => o.key.trim());
      state.options.forEach((option, index) => {
        if (!option.key.trim())
          errors[`option-key-${index}`] = "Option key is required.";
        else if (option.key.trim().length > 64)
          errors[`option-key-${index}`] =
            "Option key must be 64 characters or fewer.";
        if (!option.label.trim())
          errors[`option-label-${index}`] = "Option label is required.";
        else if (option.label.trim().length > 500)
          errors[`option-label-${index}`] =
            "Option label must be 500 characters or fewer.";
      });
      const filled = keys.filter((key) => key);
      if (filled.length > 0 && new Set(filled).size !== filled.length) {
        errors.options = "Option keys must be unique.";
      }
      if (!state.correct_choice_key.trim())
        errors.correct_choice_key = "Select the correct answer.";
      else if (!keys.includes(state.correct_choice_key.trim()))
        errors.correct_choice_key =
          "Correct answer must match one of the option keys.";
      break;
    }
    case "EXTERNAL_TASK": {
      const url = state.external_url.trim();
      if (!url) errors.external_url = "External URL is required.";
      else if (url.length > 2048)
        errors.external_url = "URL must be 2048 characters or fewer.";
      else {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "https:")
            errors.external_url = "External URL must use HTTPS.";
          else if (parsed.username || parsed.password)
            errors.external_url =
              "External URL must not embed credentials.";
        } catch {
          errors.external_url = "Enter a valid public HTTPS URL.";
        }
      }
      break;
    }
    case "TEXT_RESPONSE": {
      const raw = state.text_max_length.trim();
      const parsed = Number(raw);
      if (!raw || !Number.isInteger(parsed) || parsed < 1 || parsed > 20000)
        errors.text_max_length =
          "Enter a whole number from 1 to 20000.";
      break;
    }
    case "FILE_UPLOAD":
      break;
  }
  return errors;
}
