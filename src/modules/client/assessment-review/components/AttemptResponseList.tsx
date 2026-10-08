"use client";

import { cn } from "@/lib/utils";
import type { EmployerTaskView } from "../services/context";
import type { ReviewResponseView } from "../services/read";

function responseTextFor(response: ReviewResponseView | undefined): string {
  if (!response) return "No response submitted";
  if (response.task_type === "SINGLE_CHOICE") return response.selected_choice_key ?? "No response submitted";
  if (response.task_type === "FILE_UPLOAD") return response.proof_file_name ?? response.proof_file_id ?? "No file submitted";
  return response.response_text?.trim() ? response.response_text : "No response submitted";
}

interface AttemptResponseListProps {
  tasks: EmployerTaskView[];
  responses: ReviewResponseView[];
}

/** Read-only view of one attempt's task-by-task responses and proof links. */
export default function AttemptResponseList({ tasks, responses }: AttemptResponseListProps) {
  const responseByTask = new Map(responses.map((entry) => [entry.job_task_id, entry]));
  return (
    <div className="mt-2 space-y-2">
      {tasks.map(({ job_task_id, task }) => {
        const response = responseByTask.get(job_task_id);
        const isChoice = task.task_type === "SINGLE_CHOICE";
        const selected = response?.selected_choice_key ?? null;
        const correctKey = task.task_type === "SINGLE_CHOICE" ? task.correct_choice_key : "";
        const match = isChoice && selected && correctKey ? selected === correctKey : null;
        return (
          <div key={job_task_id} className="rounded-md border border-border/50 p-2.5">
            <p className="text-sm font-semibold text-foreground md:text-xs">{task.title}</p>
            <p className="mt-1 text-sm text-muted-foreground md:text-xs">
              Response: <span className="text-foreground font-medium">{responseTextFor(response)}</span>
            </p>
            {isChoice && (
              <p className={cn(
                "mt-1 text-sm font-medium md:text-xs",
                match === null ? "text-muted-foreground" : match ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
              )}>
                {match === null
                  ? "Awaiting answer comparison"
                  : match
                    ? `Correct (key: ${correctKey})`
                    : `Incorrect — candidate: ${selected}, correct: ${correctKey}`}
              </p>
            )}
            {response?.proof_file_id && (
              <a
                href={`/api/assets/${response.proof_file_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex text-sm font-semibold text-primary hover:underline md:text-xs"
              >
                View proof file
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
