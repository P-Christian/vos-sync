"use client";

import { Check, Lock, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  availableCourseRequestActions,
  courseInboxRowState,
  type CourseRequestCandidate,
  type CourseRequestFeedback,
  type CourseRequestInboxRow,
} from "@/modules/school-admin/hooks/useCourseRequests";
import {
  describeFinalizingLock,
  describeLockedCourse,
  formatRouteAudit,
  requestReference,
} from "../services/course-request-inbox.helpers";

type InboxTableVariant = "routed" | "finalizing";

interface CourseRequestInboxTableProps {
  readonly rows: readonly CourseRequestInboxRow[];
  readonly variant: InboxTableVariant;
  /** Active same-school candidates, used only to label the persisted finalizing lock. */
  readonly courses: readonly CourseRequestCandidate[];
  readonly feedbackByRow: Readonly<Record<number, CourseRequestFeedback>>;
  readonly busyByRow: Readonly<Record<number, boolean>>;
  readonly onApprove: (row: CourseRequestInboxRow) => void;
  readonly onReject: (row: CourseRequestInboxRow) => void;
  readonly onResume: (row: CourseRequestInboxRow) => void;
}

/**
 * One status tone for the single inbox status literal. Finalizing rows add a
 * separate amber lock badge; both badges are `whitespace-nowrap` so no status
 * ever clips mid-word.
 */
function statusTone(status: CourseRequestInboxRow["requestStatus"]): string {
  return status === "RoutedToSchool"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

function feedbackTone(tone: CourseRequestFeedback["tone"]): string {
  switch (tone) {
    case "success":
      return "text-emerald-700";
    case "stale":
    case "finalizing":
      return "text-amber-700";
    case "removed":
      return "text-slate-600";
    case "error":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Privacy-limited inbox table. Renders ONLY the allowlisted inbox row and
 * candidate fields. The Actions column is pinned sticky-right inside the
 * horizontal scroll container and both status badges are `whitespace-nowrap`,
 * so the actions and badges stay fully visible at 1440x900, 1024x768, 390x844
 * and 1680-wide viewports without page-level horizontal overflow. Finalizing
 * rows render the persisted locked course/original reviewer and ONLY Resume.
 */
export function CourseRequestInboxTable({
  rows,
  variant,
  courses,
  feedbackByRow,
  busyByRow,
  onApprove,
  onReject,
  onResume,
}: CourseRequestInboxTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Submitter</TableHead>
              <TableHead>Requested Course</TableHead>
              <TableHead>Route Audit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sticky right-0 z-10 border-l border-border/60 bg-card text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const state = courseInboxRowState(row);
              const actions = availableCourseRequestActions(row);
              const feedback = feedbackByRow[row.courseRequestId];
              const busy = busyByRow[row.courseRequestId] === true;
              const locked =
                state.kind === "finalizing" && row.matchedSchoolCourseId !== null
                  ? describeLockedCourse(row, courses)
                  : null;
              return (
                <TableRow
                  key={row.courseRequestId}
                  data-testid={`course-request-row-${String(row.courseRequestId)}`}
                  data-request-status={row.requestStatus}
                  data-row-state={state.kind}
                  data-variant={variant}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span
                        className="font-medium"
                        data-testid={`course-request-submitter-${String(row.courseRequestId)}`}
                      >
                        {row.submitterName.trim().length > 0 ? row.submitterName : "Unknown submitter"}
                      </span>
                      <span
                        className="font-mono text-xs text-muted-foreground"
                        data-testid={`course-request-ref-${String(row.courseRequestId)}`}
                      >
                        {requestReference(row)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-normal">
                    <span data-testid={`course-request-requested-course-${String(row.courseRequestId)}`}>
                      {row.requestedCourseName}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-normal">
                    <div data-testid={`course-request-route-audit-${String(row.courseRequestId)}`}>
                      {formatRouteAudit(row)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge
                        variant="outline"
                        className={cn("whitespace-nowrap", statusTone(row.requestStatus))}
                        data-testid={`course-request-status-${String(row.courseRequestId)}`}
                      >
                        {row.requestStatus}
                      </Badge>
                      {state.kind === "finalizing" &&
                      row.matchedSchoolCourseId !== null &&
                      row.reviewedBy !== null ? (
                        <>
                          <Badge
                            variant="outline"
                            className="whitespace-nowrap border-amber-300 bg-amber-100 text-amber-800"
                            data-testid={`course-request-finalizing-${String(row.courseRequestId)}`}
                          >
                            <Lock className="mr-1 h-3 w-3" />
                            Finalizing
                          </Badge>
                          <span
                            className="max-w-[16rem] text-xs text-muted-foreground whitespace-normal"
                            data-testid={`course-request-locked-course-${String(row.courseRequestId)}`}
                          >
                            {describeFinalizingLock(row, courses)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="sticky right-0 z-10 border-l border-border/60 bg-card">
                    <div className="flex flex-col items-end gap-1.5">
                      {locked !== null ? (
                        <span
                          className="whitespace-nowrap text-right text-xs text-muted-foreground"
                          data-testid={`course-request-locked-summary-${String(row.courseRequestId)}`}
                        >
                          {locked.resolved ? locked.label : "Persisted course"}
                          {locked.code !== null ? ` (${locked.code})` : ""}
                        </span>
                      ) : null}
                      <div className="flex justify-end gap-2">
                        {actions.includes("approve") &&
                        state.kind === "actionable" &&
                        row.matchedSchoolCourseId === null &&
                        row.reviewedBy === null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove(row)}
                            disabled={busy}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            aria-label={`Approve course request ${String(row.courseRequestId)}`}
                            data-testid={`course-request-approve-${String(row.courseRequestId)}`}
                          >
                            <Check className="h-4 w-4" />
                            <span className="ml-1 hidden xl:inline">Approve</span>
                          </Button>
                        ) : null}
                        {actions.includes("reject") &&
                        state.kind === "actionable" &&
                        row.matchedSchoolCourseId === null &&
                        row.reviewedBy === null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(row)}
                            disabled={busy}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label={`Reject course request ${String(row.courseRequestId)}`}
                            data-testid={`course-request-reject-${String(row.courseRequestId)}`}
                          >
                            <X className="h-4 w-4" />
                            <span className="ml-1 hidden xl:inline">Reject</span>
                          </Button>
                        ) : null}
                        {actions.includes("resume") &&
                        state.kind === "finalizing" &&
                        row.matchedSchoolCourseId !== null &&
                        row.reviewedBy !== null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResume(row)}
                            disabled={busy}
                            className="text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            aria-label={`Resume locked course decision for request ${String(row.courseRequestId)}`}
                            data-testid={`course-request-resume-${String(row.courseRequestId)}`}
                          >
                            <RotateCcw className={cn("h-4 w-4", busy && "animate-spin")} />
                            <span className="ml-1 hidden xl:inline">Resume</span>
                          </Button>
                        ) : null}
                      </div>
                      {feedback !== undefined ? (
                        <span
                          data-testid={`course-request-feedback-${String(row.courseRequestId)}`}
                          data-tone={feedback.tone}
                          className={cn("max-w-[24rem] text-right text-xs", feedbackTone(feedback.tone))}
                        >
                          {feedback.message}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
