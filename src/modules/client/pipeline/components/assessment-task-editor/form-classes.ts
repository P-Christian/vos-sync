// src/modules/client/pipeline/components/assessment-task-editor/form-classes.ts
// Shared field styling for the task form: error ring when invalid.

export function taskInputClass(hasError: boolean): string {
  return `h-9 text-xs ${hasError ? "border-destructive focus-visible:ring-destructive/40" : ""}`;
}
