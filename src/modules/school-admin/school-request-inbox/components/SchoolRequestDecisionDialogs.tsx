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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  SchoolAttendanceAcademics,
  SchoolInboxRow,
} from "@/modules/school-admin/hooks/useSchoolRequests";
import {
  describeApprovalOutcome,
  describeCourse,
  formatEducationRange,
  validateAcademicsInput,
} from "../services/school-request-inbox.helpers";

/**
 * Attendance decision dialogs.
 *
 * The approval dialog collects ONLY the three optional academic values that
 * the decision endpoint accepts (student number, GPA 0..5, school or
 * completion year). It never renders or submits identity, school, education,
 * course, or classification fields. The rejection dialog requires a trimmed
 * nonblank reason and blocks whitespace-only input before any network call.
 */

function SubmissionSummary({ row }: { readonly row: SchoolInboxRow }) {
  const course = describeCourse(row);
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Student</dt>
        <dd
          className="font-medium"
          data-testid="dialog-submitter"
        >
          {row.submitterName.trim().length > 0 ? row.submitterName : "Name not available"}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">School</dt>
        <dd data-testid="dialog-requested-school">{row.requestedSchoolName}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Course</dt>
        <dd data-testid="dialog-course">{course.label}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted-foreground">Education dates</dt>
        <dd data-testid="dialog-education-dates">
          {formatEducationRange(row.education.startDate, row.education.endDate)}
        </dd>
      </div>
    </dl>
  );
}

interface ApproveAttendanceDialogProps {
  readonly row: SchoolInboxRow;
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Resolves true when the dialog may close (committed/stale/removed/finalizing). */
  readonly onConfirm: (row: SchoolInboxRow, academics: SchoolAttendanceAcademics) => Promise<boolean>;
}

/** Mounted only while a row is selected (keyed by request id); unmount resets fields. */
export function ApproveAttendanceDialog({
  row,
  busy,
  onOpenChange,
  onConfirm,
}: ApproveAttendanceDialogProps) {
  const [studentNumber, setStudentNumber] = useState("");
  const [gpa, setGpa] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  const outcome = describeApprovalOutcome(row);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const validation = validateAcademicsInput({ studentNumber, gpa, schoolYear });
    if (validation.error !== null) {
      setError(validation.error);
      return;
    }
    const shouldClose = await onConfirm(row, validation.academics);
    if (shouldClose) {
      onOpenChange(false);
    } else {
      setError("The approval was not saved. Check the message on this request and try again.");
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="approve-dialog">
        <DialogHeader>
          <DialogTitle>Approve attendance request</DialogTitle>
          <DialogDescription>
            Confirm that this student attended your school. You can also add their student number,
            GPA, and school year.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
          <SubmissionSummary row={row} />

          <div
            data-testid="approve-outcome"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <p className="font-semibold">{outcome.title}</p>
            <p className="mt-1">{outcome.body}</p>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Optional. These details are saved once when you approve and cannot be changed later.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendance_student_number">Student Number</Label>
                <Input
                  id="attendance_student_number"
                  data-testid="approve-student-number"
                  placeholder="e.g. 2026-00123"
                  value={studentNumber}
                  onChange={(event) => setStudentNumber(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance_gpa">GPA (0-5)</Label>
                <Input
                  id="attendance_gpa"
                  data-testid="approve-gpa"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 1.75"
                  value={gpa}
                  onChange={(event) => setGpa(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance_school_year">School / Completion Year</Label>
                <Input
                  id="attendance_school_year"
                  data-testid="approve-school-year"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 2026"
                  value={schoolYear}
                  onChange={(event) => setSchoolYear(event.target.value)}
                />
              </div>
            </div>
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
            <Button type="submit" disabled={busy} data-testid="approve-confirm">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve attendance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RejectAttendanceDialogProps {
  readonly row: SchoolInboxRow;
  readonly busy: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Resolves true when the dialog may close (rejected/removed). */
  readonly onConfirm: (row: SchoolInboxRow, remarks: string) => Promise<boolean>;
}

/** Mounted only while a row is selected (keyed by request id). */
export function RejectAttendanceDialog({
  row,
  busy,
  onOpenChange,
  onConfirm,
}: RejectAttendanceDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (remarks.trim().length === 0) {
      setError("A rejection reason is required.");
      return;
    }
    const shouldClose = await onConfirm(row, remarks.trim());
    if (shouldClose) {
      onOpenChange(false);
    } else {
      setError("The rejection was not saved. Check the message on this request and try again.");
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="reject-dialog">
        <DialogHeader>
          <DialogTitle>Reject attendance request</DialogTitle>
          <DialogDescription>
            Rejecting does not change the student&apos;s education record. A corrected request can
            be sent later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <SubmissionSummary row={row} />

          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Only reject if you cannot confirm that this student attended your school.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendance_reject_reason">Reason *</Label>
            <Textarea
              id="attendance_reject_reason"
              data-testid="reject-remarks"
              placeholder="Explain why you are rejecting this request."
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              aria-invalid={error !== null}
              rows={4}
            />
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
              disabled={busy}
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
