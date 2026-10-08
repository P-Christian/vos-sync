// Presentational rendering of one stored assessment response against its
// employer task definition: single choice, text, external task, file proof.
"use client";

import { ExternalLink, FileText } from "lucide-react";
import type { AssessmentTaskEmployerDTO } from "@/modules/shared/assessment";

/** One stored response row as returned by the client assessment review GET. */
export interface ReviewResponseView {
  job_task_id: number;
  selected_choice_key: string | null;
  response_text: string | null;
  proof_file_id: string | null;
  proof_file_name: string | null;
}

function MissingResponse() {
  return (
    <p className="text-sm italic text-muted-foreground md:text-xs">
      No response submitted
    </p>
  );
}

export default function AssessmentTaskResponse({
  task,
  response,
}: {
  task: AssessmentTaskEmployerDTO;
  response: ReviewResponseView | undefined;
}) {
  switch (task.task_type) {
    case "SINGLE_CHOICE": {
      const key = response?.selected_choice_key ?? null;
      const label = key
        ? task.choice_options.find((option) => option.key === key)?.label ?? key
        : null;
      return label ? (
        <p className="text-sm font-medium text-foreground md:text-xs">{label}</p>
      ) : (
        <MissingResponse />
      );
    }
    case "TEXT_RESPONSE": {
      const text = response?.response_text?.trim() ?? "";
      return text ? (
        <p className="whitespace-pre-wrap text-sm font-medium text-foreground md:text-xs">
          {text}
        </p>
      ) : (
        <MissingResponse />
      );
    }
    case "EXTERNAL_TASK": {
      const text = response?.response_text?.trim() ?? "";
      return (
        <div className="space-y-1.5">
          {text ? (
            <p className="whitespace-pre-wrap text-sm font-medium text-foreground md:text-xs">
              {text}
            </p>
          ) : (
            <MissingResponse />
          )}
          {task.external_url && (
            <a
              href={task.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline md:text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open external task
            </a>
          )}
        </div>
      );
    }
    case "FILE_UPLOAD": {
      if (!response?.proof_file_id) return <MissingResponse />;
      return (
        <a
          href={`/api/assets/${response.proof_file_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-primary hover:underline md:text-xs"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{response.proof_file_name ?? "Uploaded file"}</span>
        </a>
      );
    }
    default: {
      const unreachable: never = task;
      throw new Error(
        `Unhandled assessment task type: ${JSON.stringify(unreachable)}`,
      );
    }
  }
}
