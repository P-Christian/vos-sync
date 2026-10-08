// src/modules/client/pipeline/components/JobAssessmentTaskBlock.tsx
// Job-scoped wrapper around the shared AssessmentTaskEditor. Builds the
// job assessment-task endpoint URLs for one job ASSESSMENT stage and
// forwards the editor's unchanged { stageId, stageType, endpoints } contract.
"use client";

import type { CanonicalStageType } from "../types";
import AssessmentTaskEditor from "./AssessmentTaskEditor";

interface JobAssessmentTaskBlockProps {
  jobId: number;
  stageId: number;
  stageType: CanonicalStageType;
  readOnly?: boolean;
  initialWindowDays?: number | null;
}

export default function JobAssessmentTaskBlock({
  jobId,
  stageId,
  stageType,
  readOnly = false,
  initialWindowDays = null,
}: JobAssessmentTaskBlockProps) {
  const base = `/api/client/jobs/${jobId}/pipeline/stages/${stageId}/assessment-tasks`;
  return (
    <div className="w-full pt-1">
      <AssessmentTaskEditor
        stageId={stageId}
        stageType={stageType}
        readOnly={readOnly}
        initialWindowDays={initialWindowDays}
        endpoints={{
          list: base,
          create: base,
          update: (taskId: number) => `${base}/${taskId}`,
          remove: (taskId: number) => `${base}/${taskId}`,
          reorder: `${base}/reorder`,
          window: `/api/client/jobs/${jobId}/pipeline/stages/${stageId}`,
        }}
      />
    </div>
  );
}
