"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssessmentAttemptDTO, PersistedAttemptStatus } from "@/modules/shared/assessment";
import type { EmployerTaskView } from "../services/context";
import type { ReviewResponseView } from "../services/read";
import AttemptActionBar, { type AttemptBarAction } from "./AttemptActionBar";
import AttemptResponseList from "./AttemptResponseList";
import type { ReviewConfirmAction } from "./ReviewConfirmDialog";

const STATUS_STYLES: Record<PersistedAttemptStatus, string> = {
  IN_PROGRESS: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400",
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  UNDER_REVIEW: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  NEEDS_REVISION: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  PASSED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  FAILED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
};

const STATUS_LABELS: Record<PersistedAttemptStatus, string> = {
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  NEEDS_REVISION: "Needs revision",
  PASSED: "Passed",
  FAILED: "Failed",
};

/** Reviewer controls; present only for attempts of the current assessment stage. */
export interface AttemptControls {
  notes: string;
  busy: boolean;
  onNotesChange: (value: string) => void;
  onRunAction: (attemptId: number, action: AttemptBarAction) => void;
  onAskConfirm: (attemptId: number, action: ReviewConfirmAction) => void;
}

interface AttemptHistoryCardProps {
  attempt: AssessmentAttemptDTO;
  tasks: EmployerTaskView[];
  responses: ReviewResponseView[];
  controls?: AttemptControls;
}

/** One assessment attempt: outcome badge, responses, and proof links.
 *  Interactive (review + action controls) only when `controls` is provided;
 *  otherwise fully read-only. */
export default function AttemptHistoryCard({
  attempt,
  tasks,
  responses,
  controls,
}: AttemptHistoryCardProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-foreground md:text-xs">
          Attempt {attempt.attempt_number}
        </p>
        <Badge variant="outline" className={cn("text-xs font-medium px-2 py-0 md:text-[10px]", STATUS_STYLES[attempt.status])}>
          {STATUS_LABELS[attempt.status]}
        </Badge>
      </div>
      <AttemptResponseList tasks={tasks} responses={responses} />
      {attempt.review_notes && (
        <p className="mt-2 text-sm text-foreground/90 whitespace-pre-line md:text-xs">
          <span className="font-semibold">Reviewer notes: </span>
          {attempt.review_notes}
        </p>
      )}
      {controls && (
        <>
          <textarea
            value={controls.notes}
            onChange={(event) => controls.onNotesChange(event.target.value)}
            placeholder="Reviewer notes (required for Fail / Request revision)"
            rows={2}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground md:text-xs"
          />
          <AttemptActionBar
            status={attempt.status}
            attemptId={attempt.id}
            busy={controls.busy}
            onRun={controls.onRunAction}
            onAskConfirm={controls.onAskConfirm}
          />
        </>
      )}
    </div>
  );
}
