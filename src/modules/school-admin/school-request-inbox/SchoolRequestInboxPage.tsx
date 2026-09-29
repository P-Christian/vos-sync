"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ClipboardCheck, Inbox, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyPlaceholder } from "@/components/shared/EmptyPlaceholder";
import { SchoolAdminModuleHeader } from "@/modules/school-admin/components/SchoolAdminModuleHeader";
import {
  assertNeverSchoolAdminVariant,
  feedbackForSchoolAttendanceOutcome,
  feedbackForSchoolReconcileOutcome,
  useSchoolRequests,
  type SchoolAttendanceAcademics,
  type SchoolAttendanceFeedback,
  type SchoolAttendanceOutcome,
  type SchoolInboxRow,
} from "@/modules/school-admin/hooks/useSchoolRequests";
import { ApproveAttendanceDialog, RejectAttendanceDialog } from "./components/SchoolRequestDecisionDialogs";
import { SchoolRequestInboxTable } from "./components/SchoolRequestInboxTable";
import {
  SchoolRequestInboxAccessPanel,
  SchoolRequestInboxErrorBanner,
  SchoolRequestInboxSkeleton,
} from "./components/SchoolRequestInboxStates";
import { classifyInboxLoadError, visibleInboxRows } from "./services/school-request-inbox.helpers";

/**
 * Privacy-limited School Admin attendance inbox.
 *
 * Consumes the school-request API and state hook without widening their contract:
 *  - renders ONLY the allowed DTO fields (student display name, requested
 *    school name, course, education dates, submitted date, and the saved
 *    decision time);
 *  - approving saves the decision and marks the education as verified right
 *    away, with no extra course request created;
 *  - rejects with a trimmed nonblank reason;
 *  - renders loading/empty/error/forbidden/stale/unfinished-approval states;
 *  - never renders or submits identity, alumni, school, education, course, or
 *    classification overrides.
 */

function showFeedbackToast(feedback: SchoolAttendanceFeedback): void {
  switch (feedback.tone) {
    case "success":
      toast.success(feedback.message);
      return;
    case "stale":
    case "finalizing":
      toast.warning(feedback.message);
      return;
    case "removed":
      toast.info(feedback.message);
      return;
    case "error":
      toast.error(feedback.message);
      return;
    default:
      assertNeverSchoolAdminVariant(feedback.tone);
  }
}

interface SchoolRequestInboxPageProps {
  /** Rendered directly below the header card, above the scope paragraph. */
  readonly belowHeader?: ReactNode;
}

export function SchoolRequestInboxPage({ belowHeader }: SchoolRequestInboxPageProps) {
  const {
    inbox,
    routed,
    finalizing,
    loading,
    error,
    feedbackByRow,
    claims,
    busyByRow,
    reconcileBusy,
    reconcileFeedback,
    loadInbox,
    approveSchoolAttendance,
    rejectSchoolAttendance,
    resumeSchoolAttendance,
    reconcileSchoolAttendance,
  } = useSchoolRequests();

  const [approveRow, setApproveRow] = useState<SchoolInboxRow | null>(null);
  const [rejectRow, setRejectRow] = useState<SchoolInboxRow | null>(null);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  /** True when the calling dialog may close; false keeps it open on failure. */
  const settleOutcome = useCallback((outcome: SchoolAttendanceOutcome): boolean => {
    showFeedbackToast(feedbackForSchoolAttendanceOutcome(outcome));
    switch (outcome.kind) {
      case "approved":
      case "rejected":
      case "stale":
      case "removed":
      case "finalizing":
        return true;
      case "failed":
        return false;
      default:
        return assertNeverSchoolAdminVariant(outcome);
    }
  }, []);

  const handleApprove = useCallback(
    async (row: SchoolInboxRow, academics: SchoolAttendanceAcademics): Promise<boolean> => {
      const outcome = await approveSchoolAttendance(row.schoolRequestId, academics);
      return settleOutcome(outcome);
    },
    [approveSchoolAttendance, settleOutcome],
  );

  const handleReject = useCallback(
    async (row: SchoolInboxRow, remarks: string): Promise<boolean> => {
      const outcome = await rejectSchoolAttendance(row.schoolRequestId, remarks);
      return settleOutcome(outcome);
    },
    [rejectSchoolAttendance, settleOutcome],
  );

  const handleResume = useCallback(
    async (row: SchoolInboxRow): Promise<void> => {
      const outcome = await resumeSchoolAttendance(row.schoolRequestId);
      settleOutcome(outcome);
    },
    [resumeSchoolAttendance, settleOutcome],
  );

  const handleReconcile = useCallback(async (): Promise<void> => {
    const outcome = await reconcileSchoolAttendance();
    showFeedbackToast(feedbackForSchoolReconcileOutcome(outcome));
  }, [reconcileSchoolAttendance]);

  const schoolId = inbox?.schoolId ?? null;
  // Defense in depth: a row may render only when its PERSISTED matched school
  // equals the inbox's own school. Foreign rows never reach a cell.
  const routedRows = schoolId === null ? [] : visibleInboxRows(routed, schoolId);
  const finalizingRows = schoolId === null ? [] : visibleInboxRows(finalizing, schoolId);
  const isEmpty = inbox !== null && routedRows.length === 0 && finalizingRows.length === 0;

  const headerActions = (
    <div className="flex items-center gap-2">
      {finalizingRows.length > 0 ? (
        <Button
          variant="outline"
          onClick={() => void handleReconcile()}
          disabled={reconcileBusy}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:text-white shadow-sm"
          data-testid="school-request-reconcile"
        >
          <RotateCcw className={reconcileBusy ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Finish saved approvals
        </Button>
      ) : null}
      <Button
        variant="outline"
        onClick={() => void loadInbox()}
        disabled={loading}
        className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:text-white shadow-sm"
        data-testid="school-request-refresh"
      >
        <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
        Refresh
      </Button>
    </div>
  );

  // Every render state shares one root: the header card and the injected tab
  // strip stay mounted, and only this content changes with the state.
  let content: ReactNode;
  if (loading && inbox === null) {
    content = <SchoolRequestInboxSkeleton />;
  } else if (error !== null) {
    const failure = classifyInboxLoadError(error);
    content =
      failure === "forbidden" || failure === "unauthenticated" ? (
        <SchoolRequestInboxAccessPanel kind={failure} message={error} />
      ) : (
        <SchoolRequestInboxErrorBanner message={error} loading={loading} onRetry={() => void loadInbox()} />
      );
  } else {
    content = (
      <>
        {schoolId !== null ? (
          <p className="text-xs text-muted-foreground" data-testid="school-request-scope">
            {routedRows.length === 1
              ? "1 request waiting for your decision."
              : `${String(routedRows.length)} requests waiting for your decision.`}
          </p>
        ) : null}

        {reconcileFeedback !== null ? (
          <p
            data-testid="school-request-reconcile-feedback"
            data-tone={reconcileFeedback.tone}
            className="text-sm text-muted-foreground"
          >
            {reconcileFeedback.message}
          </p>
        ) : null}

        {isEmpty ? (
          <div data-testid="school-request-empty">
            <EmptyPlaceholder
              icon={Inbox}
              title="No attendance requests yet"
              description="Requests from people who listed your school will show up here for review."
            />
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Waiting for your decision</h2>
                <Badge variant="secondary">{routedRows.length}</Badge>
              </div>
              {routedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="school-request-routed-empty">
                  No requests need your decision right now.
                </p>
              ) : (
                <SchoolRequestInboxTable
                  rows={routedRows}
                  variant="routed"
                  feedbackByRow={feedbackByRow}
                  busyByRow={busyByRow}
                  claims={claims}
                  onApprove={setApproveRow}
                  onReject={setRejectRow}
                  onResume={(row) => void handleResume(row)}
                />
              )}
            </section>

            {finalizingRows.length > 0 ? (
              <section className="space-y-3" data-testid="school-request-finalizing">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-semibold">Unfinished approvals</h2>
                  <Badge variant="secondary">{finalizingRows.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  These approvals were saved but did not finish. Use Finish saved approvals to
                  complete them. Saved student details can no longer be edited.
                </p>
                <SchoolRequestInboxTable
                  rows={finalizingRows}
                  variant="finalizing"
                  feedbackByRow={feedbackByRow}
                  busyByRow={busyByRow}
                  claims={claims}
                  onApprove={setApproveRow}
                  onReject={setRejectRow}
                  onResume={(row) => void handleResume(row)}
                />
              </section>
            ) : null}
          </>
        )}
      </>
    );
  }

  return (
    <div className="w-[90%] max-w-[2000px] mx-auto space-y-6" data-testid="school-request-inbox">
      <SchoolAdminModuleHeader
        title="Attendance Requests"
        description="Review requests from students who listed your school. Approve to verify their education, or reject with a reason."
        icon={ClipboardCheck}
        actions={headerActions}
      />

      {belowHeader}

      {content}

      {approveRow !== null ? (
        <ApproveAttendanceDialog
          key={approveRow.schoolRequestId}
          row={approveRow}
          busy={busyByRow[approveRow.schoolRequestId] === true}
          onOpenChange={(open) => {
            if (!open) setApproveRow(null);
          }}
          onConfirm={handleApprove}
        />
      ) : null}

      {rejectRow !== null ? (
        <RejectAttendanceDialog
          key={rejectRow.schoolRequestId}
          row={rejectRow}
          busy={busyByRow[rejectRow.schoolRequestId] === true}
          onOpenChange={(open) => {
            if (!open) setRejectRow(null);
          }}
          onConfirm={handleReject}
        />
      ) : null}
    </div>
  );
}
