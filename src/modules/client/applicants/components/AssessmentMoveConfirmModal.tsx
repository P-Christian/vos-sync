// Move-time assessment decision: shown before a candidate leaves a
// task-bearing ASSESSMENT stage via a configured transition. Loads the
// applicant's assessment attempts from the employer review GET, renders every
// task prompt with the freelancer's response, then records Pass/Fail through
// the parent move flow or requests a revision in place (no stage change).
// Never moves on its own; the caller applies the Pass/Fail target.
"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ClipboardCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AssessmentMoveOutcome } from "../types";
import AssessmentAttemptReview, {
  type AssessmentReviewPayload,
  type ReviewAttemptView,
} from "./AssessmentAttemptReview";

/** Review state is keyed by application so a stale fetch never leaks across applicants. */
interface ReviewState {
  applicationId: number;
  payload: AssessmentReviewPayload | null;
  failed: boolean;
}

function useAssessmentReview(
  open: boolean,
  applicationId: number | null,
  retryToken: number,
): { payload: AssessmentReviewPayload | null; loading: boolean; failed: boolean } {
  const [state, setState] = useState<ReviewState | null>(null);

  useEffect(() => {
    if (!open || applicationId === null) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(
          `/api/client/applicants/${applicationId}/assessment`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!res.ok) {
          setState({ applicationId, payload: null, failed: true });
          return;
        }
        const payload = (await res.json()) as AssessmentReviewPayload;
        setState({ applicationId, payload, failed: false });
      } catch {
        if (!controller.signal.aborted) {
          setState({ applicationId, payload: null, failed: true });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [open, applicationId, retryToken]);

  if (state === null || state.applicationId !== applicationId) {
    return { payload: null, loading: open, failed: false };
  }
  return { payload: state.payload, loading: false, failed: state.failed };
}

interface AssessmentMoveConfirmModalProps {
  open: boolean;
  applicationId: number | null;
  applicantName: string;
  fromStageName: string;
  toStageName: string;
  confirming: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (outcome: AssessmentMoveOutcome) => void;
  onRevisionDone?: () => void;
}

type ModalPendingAction = AssessmentMoveOutcome | "REVISION";

function latestReviewAttempt(
  payload: AssessmentReviewPayload | null,
): ReviewAttemptView | null {
  if (payload === null || payload.attempts.length === 0) return null;
  return payload.attempts.reduce<ReviewAttemptView | null>(
    (best, view) =>
      best === null || view.attempt.attempt_number > best.attempt.attempt_number
        ? view
        : best,
    null,
  );
}

export default function AssessmentMoveConfirmModal({
  open,
  applicationId,
  applicantName,
  fromStageName,
  toStageName,
  confirming,
  error,
  onCancel,
  onConfirm,
  onRevisionDone,
}: AssessmentMoveConfirmModalProps) {
  const [retryToken, setRetryToken] = useState(0);
  const [pending, setPending] = useState<ModalPendingAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [revisionSaving, setRevisionSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const { payload, loading, failed } = useAssessmentReview(
    open,
    applicationId,
    retryToken,
  );

  const latestAttempt = latestReviewAttempt(payload);
  const latestStatus = latestAttempt?.attempt.status ?? null;
  const canPass =
    latestStatus === "SUBMITTED" || latestStatus === "UNDER_REVIEW";
  const busy = confirming || revisionSaving;

  const resetLocalState = () => {
    setPending(null);
    setReviewNotes("");
    setLocalError("");
  };

  const handleClose = () => {
    if (busy) return;
    resetLocalState();
    onCancel();
  };

  const handleRequestRevision = async () => {
    if (applicationId === null || latestAttempt === null || busy) return;
    const notes = reviewNotes.trim();
    if (!notes) {
      setLocalError(
        "Add reviewer notes describing what the candidate should revise.",
      );
      return;
    }
    setPending("REVISION");
    setRevisionSaving(true);
    setLocalError("");
    try {
      const res = await fetch(
        `/api/client/applicants/${applicationId}/assessment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            action: "REQUEST_REVISION",
            attempt_id: latestAttempt.attempt.id,
            review_notes: notes,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: unknown;
      } | null;
      if (!res.ok) {
        setLocalError(
          json !== null && typeof json.error === "string"
            ? json.error
            : "Failed to request a revision. Please try again.",
        );
        return;
      }
      resetLocalState();
      if (onRevisionDone) onRevisionDone();
      else onCancel();
    } catch {
      setLocalError("Failed to request a revision. Please try again.");
    } finally {
      setRevisionSaving(false);
      setPending(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) handleClose();
      }}
    >
      <DialogContent className="max-w-lg max-md:max-w-[calc(100vw-2rem)] max-md:max-h-[90dvh] max-md:overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Confirm assessment decision
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground md:text-xs">
            {applicantName} is leaving {fromStageName} for {toStageName}.
            Review the assessment submission below, then Pass, Fail, or
            Request revision. Pass and Fail are saved before the move;
            Request revision keeps the candidate at the assessment stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <span>Assessment submission</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground md:text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assessment...
            </div>
          ) : failed ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-center">
              <p className="text-sm font-medium text-muted-foreground md:text-xs">
                The assessment could not be loaded.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetryToken((prev) => prev + 1)}
                className="mt-2 rounded-lg"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : payload ? (
            <AssessmentAttemptReview payload={payload} />
          ) : null}

          <div>
            <label
              htmlFor="assessment-revision-notes"
              className="mb-1 block text-sm font-semibold text-foreground md:text-xs"
            >
              Reviewer notes
            </label>
            <textarea
              id="assessment-revision-notes"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              rows={3}
              disabled={busy}
              placeholder="Required when requesting a revision…"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60 md:text-xs"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-sm md:text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          {localError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-sm md:text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {localError}
            </div>
          )}
          {!loading && !failed && !canPass && (
            <p className="text-sm text-muted-foreground md:text-xs">
              Pass is available after the candidate submits (attempt status
              SUBMITTED or UNDER_REVIEW).
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 max-md:flex-col max-md:items-stretch">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={busy}
            className="h-9 max-md:min-h-10 text-sm rounded-lg"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setPending("FAIL");
              onConfirm("FAIL");
            }}
            disabled={busy}
            className="h-9 max-md:min-h-10 text-sm rounded-lg"
          >
            {confirming && pending === "FAIL" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Fail"
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={handleRequestRevision}
            disabled={busy || latestAttempt === null}
            title={
              latestAttempt === null
                ? "No assessment submission to revise yet"
                : "Request a revision without moving the candidate"
            }
            className="h-9 max-md:min-h-10 text-sm rounded-lg"
          >
            {revisionSaving && pending === "REVISION" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Request revision"
            )}
          </Button>
          <Button
            onClick={() => {
              setPending("PASS");
              onConfirm("PASS");
            }}
            disabled={busy || !canPass}
            title={
              canPass
                ? "Record a pass and move the candidate"
                : "Pass unlocks after the candidate submits"
            }
            className="h-9 max-md:min-h-10 text-sm rounded-lg"
          >
            {confirming && pending === "PASS" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Pass"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
