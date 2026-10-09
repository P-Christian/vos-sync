"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import type { StageHistoryView } from "../services/read";
import AttemptHistoryCard, { type AttemptControls } from "./AttemptHistoryCard";
import ReviewConfirmDialog from "./ReviewConfirmDialog";

type ReviewAction = "START_REVIEW" | "PASS" | "FAIL" | "REQUEST_REVISION";

interface ReviewPayload {
  application_id: number;
  stage_id: number | null;
  tasks: StageHistoryView["tasks"];
  attempts: StageHistoryView["attempts"];
  stages: StageHistoryView[];
  deadline: string | null;
}

export default function AssessmentReviewSection({
  applicationId,
  onChanged,
}: {
  applicationId: number;
  onChanged?: () => void;
}) {
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesByAttempt, setNotesByAttempt] = useState<Record<number, string>>({});
  const [busyAttempt, setBusyAttempt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    attemptId: number;
    action: "FAIL" | "REQUEST_REVISION";
  } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/applicants/${applicationId}/assessment`, { cache: "no-store" });
      if (!res.ok) {
        setPayload(null);
        return;
      }
      const data = (await res.json()) as ReviewPayload;
      setPayload(data);
    } catch {
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  // The effect only kicks off the shared reload; every setState happens in
  // its promise callbacks, never synchronously here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload settles state only in async fetch callbacks, never synchronously
    void reload();
  }, [reload]);

  function confirmPending(): void {
    if (pendingAction) void runAction(pendingAction.attemptId, pendingAction.action);
    setPendingAction(null);
  }

  async function runAction(attemptId: number, action: ReviewAction): Promise<void> {
    setBusyAttempt(attemptId);
    setMessage(null);
    try {
      const res = await fetch(`/api/client/applicants/${applicationId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          attempt_id: attemptId,
          review_notes: notesByAttempt[attemptId]?.trim() ? notesByAttempt[attemptId] : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage(data?.error ?? "Review action failed.");
        return;
      }
      await reload();
      onChanged?.();
    } catch {
      setMessage("Review action failed.");
    } finally {
      setBusyAttempt(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground md:text-xs">Loading assessment…</p>
      </div>
    );
  }

  if (!payload || payload.stages.length === 0) {
    return (
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <span>Assessment</span>
        </div>
        <p className="text-sm text-muted-foreground md:text-xs">No assessment attempts submitted for this stage.</p>
      </div>
    );
  }

  const currentStageId = payload.stage_id;
  // The active review context only loads current-stage tasks when the
  // candidate currently sits in an ASSESSMENT stage. When that stage has no
  // attempts yet, `stages` omits it, so surface its empty state explicitly.
  const currentStageHasNoAttempts =
    payload.tasks.length > 0 &&
    !payload.stages.some((stage) => stage.stage_id === currentStageId);

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        <span>Assessment</span>
      </div>
      {message && (
        <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive md:text-xs">
          {message}
        </p>
      )}
      <div className="space-y-5">
        {payload.stages.map((stage) => {
          const isCurrentStage = stage.stage_id === currentStageId;
          return (
            <section key={stage.stage_id} className="space-y-3" aria-label={stage.stage_name}>
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/50 pb-2">
                <p className="text-sm font-semibold text-foreground md:text-xs">{stage.stage_name}</p>
                {isCurrentStage && (
                  <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 text-muted-foreground">
                    Current stage
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                {stage.attempts.map(({ attempt, responses }) => {
                  const controls: AttemptControls | undefined = isCurrentStage
                    ? {
                        notes: notesByAttempt[attempt.id] ?? "",
                        busy: busyAttempt === attempt.id,
                        onNotesChange: (value) =>
                          setNotesByAttempt((prev) => ({ ...prev, [attempt.id]: value })),
                        onRunAction: (id, action) => void runAction(id, action),
                        onAskConfirm: (id, action) => setPendingAction({ attemptId: id, action }),
                      }
                    : undefined;
                  return (
                    <AttemptHistoryCard
                      key={attempt.id}
                      attempt={attempt}
                      tasks={stage.tasks}
                      responses={responses}
                      controls={controls}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
        {currentStageHasNoAttempts && (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-center">
            <p className="text-sm text-muted-foreground font-medium md:text-xs">
              No assessment attempts submitted for the current stage.
            </p>
          </div>
        )}
      </div>
      <ReviewConfirmDialog
        pending={pendingAction}
        notesProvided={Boolean(
          pendingAction &&
            notesByAttempt[pendingAction.attemptId]?.trim(),
        )}
        busy={pendingAction !== null && busyAttempt === pendingAction.attemptId}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPending}
      />
    </div>
  );
}
