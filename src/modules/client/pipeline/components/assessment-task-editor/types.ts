// src/modules/client/pipeline/components/assessment-task-editor/types.ts
// Public prop contract + task-type metadata for the assessment task editor.
// The SAME `AssessmentTaskEditorEndpoints` / `AssessmentTaskEditorProps`
// shapes serve company pipeline stages and job pipeline stages.

import type { CanonicalStageType } from "../../types";
import type { AssessmentTaskType } from "@/modules/shared/assessment";

export interface AssessmentTaskEditorEndpoints {
  list: string;
  create: string;
  update: (taskId: number) => string;
  remove: (taskId: number) => string;
  reorder: string;
  window?: string;
  library?: string;
}

export interface AssessmentTaskEditorProps {
  stageId: number;
  stageType: CanonicalStageType;
  endpoints: AssessmentTaskEditorEndpoints;
  readOnly?: boolean;
  initialWindowDays?: number | null;
}

export const TASK_TYPE_META: Record<
  AssessmentTaskType,
  { label: string; hint: string }
> = {
  SINGLE_CHOICE: {
    label: "Single choice",
    hint: "Candidate picks one answer from fixed options.",
  },
  EXTERNAL_TASK: {
    label: "External task",
    hint: "Candidate completes work on an external link.",
  },
  FILE_UPLOAD: {
    label: "File upload",
    hint: "Candidate uploads a proof file.",
  },
  TEXT_RESPONSE: {
    label: "Text response",
    hint: "Candidate writes a bounded free-text answer.",
  },
};

export const TASK_TYPE_ORDER: AssessmentTaskType[] = [
  "SINGLE_CHOICE",
  "EXTERNAL_TASK",
  "FILE_UPLOAD",
  "TEXT_RESPONSE",
];
