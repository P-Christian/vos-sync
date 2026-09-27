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
  formatRouteAudit,
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
        <dt className="text-xs text-muted-foreground">Submitter</dt>
        <dd className="font-medium" data-testid="dialog-submitter">
          {row.submitterName.trim().length > 0 ? row.submitterName : "Unknown submitter"}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Request</dt>
        <dd className="font-mono text-xs" data-testid="dialog-request-ref">
          {requestReference(row)}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted-foreground">Requested course</dt>
        <dd data-testid="dialog-requested-course">{row.requestedCourseName}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted-foreground">Manual route audit</dt>
        <dd data-testid="dialog-route-audit">{formatRouteAudit(row)}</dd>
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
      setError("Select an Active course before approving.");
      return;
    }
    const shouldClose = await onConfirm(row, selectedCandidate.schoolCourseId);
    if (shouldClose) {
      onOpenChange(false);
    } else {
      setError("The approval did not settle. Review the feedback on this request and retry.");
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="approve-dialog">
        <DialogHeader>
          <DialogTitle>Approve course request</DialogTitle>
          <DialogDescription>
            Select the Active school course this request should be completed with. The decision
            records your reviewer claim and locks the selected course to this request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          <SubmissionSummary row={row} />

          {noCandidates ? (
            <div
              data-testid="approve-no-candidates"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              <p className="font-semibold">No Active courses are available</p>
              <p className="mt-1">
                This school has no Active course candidates right now. Add an Active course (for
                example through the Add Course flow) before approving this request.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              <p className="font-semibold">Completes the persisted request</p>
              <p className="mt-1">
                Approving links the selected course to the existing roster row and verifies the
                linked education only after the roster carries that course. The request stays
                RoutedToSchool until the decision is finalized.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="course_request_candidate">Active course *</Label>
            <div data-testid="approve-course-select">
              <SearchableSelect
                options={options}
                value={selectedCourseId === null ? "" : String(selectedCourseId)}
                onValueChange={(value) => {
                  setError(null);
                  setSelectedCourseId(value.length > 0 ? Number(value) : null);
                }}
                placeholder="Select an Active course"
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
                Approve stays disabled until a course is selected.
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
      setError("The rejection did not settle. Review the feedback on this request and retry.");
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="reject-dialog">
        <DialogHeader>
          <DialogTitle>Reject course request</DialogTitle>
          <DialogDescription>
            Rejection is terminal: the linked education and roster stay unchanged. A corrected
            request can be routed again later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SubmissionSummary row={row} />

          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Only reject when this request cannot be completed with an Active course at your
              school. The reason is recorded with your reviewer claim.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course_request_reject_reason">Reason *</Label>
            <Textarea
              id="course_request_reject_reason"
              data-testid="reject-remarks"
              placeholder="Explain why this course request is rejected."
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
                Whitespace-only reasons stay disabled; the server remains authoritative.
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
