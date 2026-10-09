// Attempt list for the move-time assessment decision: newest-first attempts
// with status, every task prompt paired to its response, and reviewer notes.
"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AssessmentAttemptDTO,
  AssessmentTaskEmployerDTO,
} from "@/modules/shared/assessment";
import AssessmentTaskResponse, {
  type ReviewResponseView,
} from "./AssessmentTaskResponse";
import { formatDate } from "../utils/applicantUtils";

export interface ReviewTaskView {
  job_task_id: number;
  task: AssessmentTaskEmployerDTO;
}

export interface ReviewAttemptView {
  attempt: AssessmentAttemptDTO;
  responses: ReviewResponseView[];
}

export interface AssessmentReviewPayload {
  tasks: ReviewTaskView[];
  attempts: ReviewAttemptView[];
}

const ATTEMPT_STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  UNDER_REVIEW: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  NEEDS_REVISION: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  PASSED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  FAILED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
};

function AttemptBlock({
  view,
  tasks,
}: {
  view: ReviewAttemptView;
  tasks: ReviewTaskView[];
}) {
  const responseByTask = new Map(
    view.responses.map((entry) => [entry.job_task_id, entry]),
  );
  const submitted = formatDate(view.attempt.submitted_at);

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground md:text-xs">
          Attempt {view.attempt.attempt_number}
        </p>
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium px-2 py-0 md:text-[10px]",
            ATTEMPT_STATUS_STYLES[view.attempt.status] ?? "",
          )}
        >
          {view.attempt.status.replace(/_/g, " ")}
        </Badge>
      </div>
      {submitted && (
        <p className="mt-0.5 text-xs text-muted-foreground">Submitted {submitted}</p>
      )}
      <div className="mt-2 space-y-2">
        {tasks.map(({ job_task_id, task }) => (
          <div
            key={job_task_id}
            className="rounded-md border border-border/50 bg-card/60 p-2.5"
          >
            <p className="text-sm font-semibold text-muted-foreground md:text-xs">
              {task.title}
            </p>
            <div className="mt-1">
              <AssessmentTaskResponse
                task={task}
                response={responseByTask.get(job_task_id)}
              />
            </div>
          </div>
        ))}
      </div>
      {view.attempt.review_notes && (
        <p className="mt-2 whitespace-pre-line text-sm text-foreground/90 md:text-xs">
          <span className="font-semibold">Reviewer notes: </span>
          {view.attempt.review_notes}
        </p>
      )}
    </div>
  );
}

export default function AssessmentAttemptReview({
  payload,
}: {
  payload: AssessmentReviewPayload;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [payload]);

  if (payload.attempts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-center">
        <p className="text-sm font-medium text-muted-foreground md:text-xs">
          No assessment submission yet
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto pr-1">
      {payload.attempts.map((view) => (
        <AttemptBlock key={view.attempt.id} view={view} tasks={payload.tasks} />
      ))}
    </div>
  );
}
