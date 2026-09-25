"use client";

import { CalendarRange, Check, Lock, RotateCcw, X } from "lucide-react";

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
  availableSchoolAttendanceActions,
  deriveFinalizingClaim,
  type SchoolAttendanceFeedback,
  type SchoolFinalizingClaim,
  type SchoolInboxRow,
} from "@/modules/school-admin/hooks/useSchoolRequests";
import {
  formatCanonicalSchool,
  formatEducationRange,
  formatInboxDateTime,
  formatReportedSchool,
  describeCanonicalCourse,
  describePersistedClaim,
} from "../services/school-request-inbox.helpers";

type InboxTableVariant = "routed" | "finalizing";

interface SchoolRequestInboxTableProps {
  readonly rows: readonly SchoolInboxRow[];
  readonly variant: InboxTableVariant;
  readonly feedbackByRow: Readonly<Record<number, SchoolAttendanceFeedback>>;
  readonly busyByRow: Readonly<Record<number, boolean>>;
  readonly claims: Readonly<Record<number, SchoolFinalizingClaim>>;
  readonly onApprove: (row: SchoolInboxRow) => void;
  readonly onReject: (row: SchoolInboxRow) => void;
  readonly onResume: (row: SchoolInboxRow) => void;
}

function statusTone(status: SchoolInboxRow["requestStatus"]): string {
  return status === "Approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function educationTone(status: SchoolInboxRow["education"]["educationStatus"]): string {
  if (status === "Verified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Unverified") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function feedbackTone(tone: SchoolAttendanceFeedback["tone"]): string {
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

export function SchoolRequestInboxTable({
  rows,
  variant,
  feedbackByRow,
  busyByRow,
  claims,
  onApprove,
  onReject,
  onResume,
}: SchoolRequestInboxTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Submitter</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Canonical Course</TableHead>
              <TableHead>Education Dates</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sticky right-0 z-10 border-l border-border/60 bg-card text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const course = describeCanonicalCourse(row);
              const persistedClaim = claims[row.schoolRequestId] ?? deriveFinalizingClaim(row) ?? null;
              const claimLabel = describePersistedClaim(row);
              const feedback = feedbackByRow[row.schoolRequestId];
              const busy = busyByRow[row.schoolRequestId] === true;
              const actions = availableSchoolAttendanceActions(row);
              return (
                <TableRow
                  key={row.schoolRequestId}
                  data-testid={`school-request-row-${String(row.schoolRequestId)}`}
                  data-request-status={row.requestStatus}
                >
                  <TableCell>
                    <span
                      className="font-medium"
                      data-testid={`school-request-submitter-${String(row.schoolRequestId)}`}
                    >
                      {row.submitterName.trim().length > 0 ? row.submitterName : "Unknown submitter"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {/* Desktop layout fix: the three school fields live in one
                        compact stacked column so the pinned Actions column and
                        both status badges stay inside the viewport. Every
                        original data-testid is preserved verbatim. */}
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                          Requested
                        </span>
                        <span
                          data-testid={`school-request-requested-school-${String(row.schoolRequestId)}`}
                        >
                          {row.requestedSchoolName}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                          Canonical
                        </span>
                        <span
                          className="inline-flex items-center gap-1.5 text-muted-foreground"
                          data-testid={`school-request-canonical-school-${String(row.schoolRequestId)}`}
                        >
                          {formatCanonicalSchool(row)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                          Reported
                        </span>
                        <span data-testid={`school-request-reported-school-${String(row.schoolRequestId)}`}>
                          {formatReportedSchool(row)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-sm whitespace-normal"
                    data-testid={`school-request-course-${String(row.schoolRequestId)}`}
                    data-course-resolved={course.resolved ? "true" : "false"}
                  >
                    {course.resolved ? (
                      <span className="font-medium">
                        {course.label}
                        {course.code !== null ? (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{course.code}</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        No canonical course - follow-on course request required
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-normal">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                      <span data-testid={`school-request-education-dates-${String(row.schoolRequestId)}`}>
                        {formatEducationRange(row.education.startDate, row.education.endDate)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-normal">
                    <div data-testid={`school-request-submitted-${String(row.schoolRequestId)}`}>
                      Submitted {formatInboxDateTime(row.createdAt)}
                    </div>
                    <div data-testid={`school-request-routed-${String(row.schoolRequestId)}`}>
                      Routed {formatInboxDateTime(row.routedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge
                        variant="outline"
                        className={cn("whitespace-nowrap", statusTone(row.requestStatus))}
                        data-testid={`school-request-status-${String(row.schoolRequestId)}`}
                      >
                        {row.requestStatus}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("whitespace-nowrap", educationTone(row.education.educationStatus))}
                        data-testid={`school-request-education-status-${String(row.schoolRequestId)}`}
                      >
                        Education {row.education.educationStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="sticky right-0 z-10 border-l border-border/60 bg-card">
                    <div className="flex flex-col items-end gap-1.5">
                      {variant === "finalizing" ? (
                        <div
                          className="whitespace-normal text-right text-xs text-muted-foreground"
                          data-testid={`school-request-claim-${String(row.schoolRequestId)}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {claimLabel ?? "Decision persisted"}
                          </span>
                          <div className="mt-0.5">Academics are locked on the roster row.</div>
                        </div>
                      ) : null}
                      {persistedClaim !== null && variant === "routed" ? (
                        <div
                          className="whitespace-normal text-right text-xs text-amber-700"
                          data-testid={`school-request-claim-${String(row.schoolRequestId)}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {claimLabel ?? "Decision persisted"}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-end gap-2">
                        {actions.includes("approve") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove(row)}
                            disabled={busy}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            data-testid={`school-request-approve-${String(row.schoolRequestId)}`}
                          >
                            <Check className="h-4 w-4" />
                            <span className="ml-1 hidden lg:inline">Approve</span>
                          </Button>
                        ) : null}
                        {actions.includes("reject") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(row)}
                            disabled={busy}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`school-request-reject-${String(row.schoolRequestId)}`}
                          >
                            <X className="h-4 w-4" />
                            <span className="ml-1 hidden lg:inline">Reject</span>
                          </Button>
                        ) : null}
                        {actions.includes("resume") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResume(row)}
                            disabled={busy}
                            className="text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            data-testid={`school-request-resume-${String(row.schoolRequestId)}`}
                          >
                            <RotateCcw className={cn("h-4 w-4", busy && "animate-spin")} />
                            <span className="ml-1 hidden lg:inline">Resume</span>
                          </Button>
                        ) : null}
                      </div>
                      {feedback !== undefined ? (
                        <span
                          data-testid={`school-request-feedback-${String(row.schoolRequestId)}`}
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
