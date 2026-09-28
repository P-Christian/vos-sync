"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CourseRequestCandidate,
  CourseRequestInboxRow,
} from "@/modules/school-admin/hooks/useCourseRequests";
import {
  candidateOptions,
  findCandidateById,
  formatInboxDateTime,
  requestReference,
  validateRejectRemarks,
} from "../services/course-request-inbox.helpers";

/**
 * Course-request decision dialogs.
 *
 * The approval dialog collects ONLY the selected Active same-school course id
 * that the strict PATCH body accepts (`{ action: "approve",
 * matched_school_course_id }`). It never renders or submits identity, school,
 * education, roster, reviewer, or status fields, and Approve stays disabled
 * until a candidate is explicitly selected. The rejection dialog requires a
 * trimmed nonblank reason and blocks whitespace-only input before any network
 * call. Both dialogs close only when the page reports a settled outcome.
 */

interface SubmissionSummaryProps {
  readonly row: CourseRequestInboxRow;
}

function SubmissionSummary({ row }: SubmissionSummaryProps) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Submitted by</dt>
        <dd className="font-medium" data-testid="dialog-submitter">
          {row.submitterName.trim().length > 0 ? row.submitterName : "Unknown submitter"}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Reference</dt>
        <dd className="font-mono text-xs" data-testid="dialog-request-ref">
          {requestReference(row)}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted-foreground">Course requested</dt>
        <dd data-testid="dialog-requested-course">{row.requestedCourseName}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Submitted</dt>
        <dd data-testid="dialog-submitted">{formatInboxDateTime(row.submittedAt)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Sent to your school</dt>
        <dd data-testid="dialog-route-audit">{formatInboxDateTime(row.routedAt)}</dd>
      </div>
    </dl>
  );
}

interface ApproveCourseRequestDialogProps {
  readonly row: CourseRequestInboxRow;
  /** Active same-school candidates from the own-school inbox DTO. */
  readonly courses: readonly CourseRequestCandidate[];
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Resolves true when the dialog may close (settled: approved/stale/removed/finalizing). */
  readonly onConfirm: (row: CourseRequestInboxRow, courseId: number) => Promise<boolean>;
}

/** Mounted only while a row is selected (keyed by request id); unmount resets the selection. */
export function ApproveCourseRequestDialog({
  row,
  courses,
  busy,
  onOpenChange,
  onConfirm,
}: ApproveCourseRequestDialogProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = selectedCourseId === null ? undefined : findCandidateById(courses, selectedCourseId);
  const options = candidateOptions(courses);
  const noCandidates = courses.length === 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (selectedCandidate === undefined) {
      setError("Select a course before approving.");
      return;
    }
    const shouldClose = await onConfirm(row, selectedCandidate.schoolCourseId);
    if (shouldClose) {
      onOpenChange(false);
    } else {
      setError("The approval did not finish. Check the message on this request, then try again.");
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="approve-dialog">
        <DialogHeader>
          <DialogTitle>Approve course request</DialogTitle>
          <DialogDescription>
            Choose the course your school will use for this request. Approving finishes the request
            with the course you select.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          <SubmissionSummary row={row} />

          {noCandidates ? (
            <div
              data-testid="approve-no-candidates"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              <p className="font-semibold">No courses available</p>
              <p className="mt-1">
                Your school has no available courses right now. Add a course first, then come back
                to approve this request.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              <p className="font-semibold">What happens when you approve</p>
              <p className="mt-1">
                The course you select is saved on the student&apos;s record, and their education is
                marked as verified.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="course_request_candidate">Course *</Label>
            <div data-testid="approve-course-select">
              <SearchableSelect
                options={options}
                value={selectedCourseId === null ? "" : String(selectedCourseId)}
                onValueChange={(value) => {
                  setError(null);
                  setSelectedCourseId(value.length > 0 ? Number(value) : null);
                }}
                placeholder="Select a course"
                disabled={busy || noCandidates}
              />
            </div>
            {selectedCandidate !== undefined ? (
              <p className="text-xs text-muted-foreground" data-testid="approve-selected-course">
                Selected: {selectedCandidate.courseName}
                {selectedCandidate.courseCode !== null ? ` (${selectedCandidate.courseCode})` : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Choose a course to enable Approve.
              </p>
            )}
          </div>

          {error !== null ? (
            <div
              data-testid="approve-error"
              className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md"
            >
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              data-testid="approve-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || selectedCandidate === undefined}
              data-testid="approve-confirm"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RejectCourseRequestDialogProps {
  readonly row: CourseRequestInboxRow;
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Resolves true when the dialog may close (settled: rejected/removed/stale). */
  readonly onConfirm: (row: CourseRequestInboxRow, remarks: string) => Promise<boolean>;
}

/** Mounted only while a row is selected (keyed by request id). */
export function RejectCourseRequestDialog({
  row,
  busy,
  onOpenChange,
  onConfirm,
}: RejectCourseRequestDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const blockingError = validateRejectRemarks(remarks);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const validationError = validateRejectRemarks(remarks);
    if (validationError !== null) {
      setError(validationError);
      return;
    }
    const shouldClose = await onConfirm(row, remarks.trim());
    if (shouldClose) {
      onOpenChange(false);
    } else {
      setError("The rejection did not finish. Check the message on this request, then try again.");
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="reject-dialog">
        <DialogHeader>
          <DialogTitle>Reject course request</DialogTitle>
          <DialogDescription>
            Rejecting cannot be undone. The student&apos;s education record stays the same. If the
            request is corrected, it can be sent again later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SubmissionSummary row={row} />

          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Only reject if your school cannot complete this request with a course. Your reason is
              saved with the request.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course_request_reject_reason">Reason *</Label>
            <Textarea
              id="course_request_reject_reason"
              data-testid="reject-remarks"
              placeholder="Explain why you are rejecting this request."
              value={remarks}
              onChange={(event) => {
                setError(null);
                setRemarks(event.target.value);
              }}
              aria-invalid={error !== null}
              rows={4}
            />
            {blockingError !== null ? (
              <p className="text-xs text-muted-foreground" data-testid="reject-blocked-hint">
                A reason is required to enable Reject.
              </p>
            ) : null}
          </div>

          {error !== null ? (
            <div
              data-testid="reject-error"
              className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md"
            >
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              data-testid="reject-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || blockingError !== null}
              variant="destructive"
              data-testid="reject-confirm"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Reject request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
