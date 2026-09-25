// src/modules/vos-admin/request-management/components/SchoolRequestsTab.tsx
//
// Plan 2 Todo 7 lane A: mode-selected school-request routing UI.
// - `attendance`: Pending rows (ungrouped AND grouped) open
//   SchoolRequestDecisionModal for Route/Group/Reject via the Todo 5 hook
//   handlers. Grouped rows keep their target until system-routed.
// - `legacy`: retains ReviewModal Approve/Reject (legacy-only bodies).
// - `frozen`: read-only, no action controls.
// Routed/Rejected/Approved rows are READ-ONLY in every mode. Each row shows
// the route audit (manual actor/time vs the system-route label/time) and the
// derived waiting indicator for grouped `Pending`.
"use client";

import React, { useMemo, useRef, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { VsSchoolRequest, ReviewAction } from "../types/request.types";
import {
  describeSchoolRouteAudit,
  renderSchoolRouteAudit,
} from "../hooks/useRequests";
import type {
  SchoolDecisionFeedback,
  SchoolDecisionOutcome,
  SchoolRequestDecision,
  SchoolRoutingCandidate,
} from "../hooks/useRequests";
import { RequestStatusBadge, isWaitingSchoolRequest } from "./RequestStatusBadge";
import { ReviewModal } from "./ReviewModal";
import { CreateSchoolRequestModal } from "./CreateSchoolRequestModal";
import {
  SchoolRequestDecisionModal,
} from "./SchoolRequestDecisionModal";
import type {
  SchoolDecisionTab,
  SchoolPlaceholderInput,
  SchoolVerificationRoute,
} from "./SchoolRequestDecisionModal";
import { Button } from "@/components/ui/button";
import { DataTable } from "./new-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";

/** Client-side mode mirror (the server page passes the gate value as a prop;
 *  client code never imports the server-only gate module). */
export type SchoolRequestsMode = "legacy" | "attendance" | "frozen";

interface Props {
  requests: VsSchoolRequest[];
  mode: SchoolRequestsMode;
  /** Repurposed Add action: guarded normalized Draft-placeholder creation. */
  onCreate: (data: unknown) => Promise<boolean>;
  /** Guarded Draft-placeholder creation from the decision dialog. */
  onCreatePlaceholder: (data: unknown) => Promise<boolean>;
  /** Legacy Approve/Reject (legacy mode only). */
  onReview: (id: number, data: ReviewAction) => Promise<boolean>;
  /** Attendance Route/Group/Reject decision (attendance mode only). */
  onDecide: (id: number, decision: SchoolRequestDecision) => Promise<SchoolDecisionOutcome>;
  onSearchSchools: (requestId: number, query: string) => Promise<SchoolRoutingCandidate[] | null>;
  candidatesFor: (requestId: number) => readonly SchoolRoutingCandidate[];
  candidatesLoadingFor: (requestId: number) => boolean;
  candidatesErrorFor: (requestId: number) => string | null;
  decisionBusyFor: (requestId: number) => boolean;
  feedbackFor: (requestId: number) => SchoolDecisionFeedback | undefined;
  /** Refetch the current filter after a committed decision (rows leave the filter). */
  onDecided: () => void;
}

function isDecisionRoute(value: string): value is SchoolVerificationRoute {
  return value === "DIRECT_REVIEW" || value === "AWAITING_ACTIVATION" || value === "AWAITING_REGISTRATION";
}

/** Narrow hook candidates to the dialog's server-derived route union. */
function toDecisionCandidates(
  candidates: readonly SchoolRoutingCandidate[],
): { school_id: number; school_name: string; city_municipality: string | null; province: string | null; verification_route: SchoolVerificationRoute }[] {
  const narrowed: { school_id: number; school_name: string; city_municipality: string | null; province: string | null; verification_route: SchoolVerificationRoute }[] = [];
  for (const candidate of candidates) {
    if (!isDecisionRoute(candidate.verification_route)) continue;
    narrowed.push({
      school_id: candidate.school_id,
      school_name: candidate.school_name,
      city_municipality: candidate.city_municipality,
      province: candidate.province,
      verification_route: candidate.verification_route,
    });
  }
  return narrowed;
}

export function SchoolRequestsTab({
  requests,
  mode,
  onCreate,
  onCreatePlaceholder,
  onReview,
  onDecide,
  onSearchSchools,
  candidatesFor,
  candidatesLoadingFor,
  candidatesErrorFor,
  decisionBusyFor,
  feedbackFor,
  onDecided,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Reject' | null>(null);
  const [decisionRequest, setDecisionRequest] = useState<VsSchoolRequest | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionTab, setDecisionTab] = useState<SchoolDecisionTab>("correct");
  const lastSearchQuery = useRef<Record<number, string>>({});

  const readOnly = mode === "frozen";

  const handleLegacyReview = (id: number, action: 'Approve' | 'Reject') => {
    setSelectedRequest(id);
    setReviewAction(action);
    setReviewOpen(true);
  };

  const submitReview = async (data: ReviewAction) => {
    if (!selectedRequest) return false;
    return await onReview(selectedRequest, data);
  };

  const openDecision = (request: VsSchoolRequest, tab: SchoolDecisionTab) => {
    setDecisionRequest(request);
    setDecisionTab(tab);
    setDecisionOpen(true);
  };

  const handleSearch = (requestId: number, query: string) => {
    lastSearchQuery.current[requestId] = query;
    void onSearchSchools(requestId, query);
  };

  const handleRetrySearch = (requestId: number) => {
    void onSearchSchools(requestId, lastSearchQuery.current[requestId] ?? "");
  };

  /** Returns true when the dialog should close (decided OR stale-refetched). */
  const settleDecision = async (
    requestId: number,
    decision: SchoolRequestDecision,
  ): Promise<boolean> => {
    const outcome = await onDecide(requestId, decision);
    if (outcome.kind === "decided" || outcome.kind === "stale") {
      onDecided();
      return true;
    }
    toast.error(outcome.message);
    return false;
  };

  const handleRoute = async (schoolId: number): Promise<boolean> => {
    if (!decisionRequest) return false;
    return settleDecision(decisionRequest.school_request_id, {
      action: "Route",
      matched_school_id: schoolId,
    });
  };

  const handleGroup = async (schoolId: number): Promise<boolean> => {
    if (!decisionRequest) return false;
    return settleDecision(decisionRequest.school_request_id, {
      action: "Group",
      matched_school_id: schoolId,
    });
  };

  const handleDecisionReject = async (adminRemarks: string): Promise<boolean> => {
    if (!decisionRequest) return false;
    return settleDecision(decisionRequest.school_request_id, {
      action: "Reject",
      admin_remarks: adminRemarks,
    });
  };

  const handleCreatePlaceholder = async (input: SchoolPlaceholderInput): Promise<boolean> => {
    return onCreatePlaceholder({
      school_name: input.school_name,
      ...(input.city_municipality !== undefined ? { city_municipality: input.city_municipality } : {}),
      ...(input.province !== undefined ? { province: input.province } : {}),
    });
  };

  const decisionRequestId = decisionRequest?.school_request_id ?? null;

  const columns = useMemo<ColumnDef<VsSchoolRequest>[]>(() => [
    {
      accessorKey: "requested_school_name",
      header: "Requested School",
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const { city_municipality, province } = row.original;
        return [city_municipality, province].filter(Boolean).join(", ") || "-";
      }
    },
    {
      id: "submitted_by",
      header: "Submitted By",
      cell: ({ row }) => {
        const by = row.original.requested_by;
        return typeof by === 'object' && by !== null
          ? `${(by as {user_fname: string}).user_fname} ${(by as {user_lname: string}).user_lname}`
          : `User #${by}`;
      }
    },
    {
      id: "target",
      header: "Target School",
      cell: ({ row }) => {
        const target = row.original.matched_school_id;
        return (
          <span data-testid="school-request-target">
            {typeof target === "number" ? `School #${target}` : "-"}
          </span>
        );
      }
    },
    {
      id: "route_audit",
      header: "Route Audit",
      cell: ({ row }) => {
        const label = renderSchoolRouteAudit(describeSchoolRouteAudit(row.original));
        return (
          <span data-testid="school-request-audit" className="text-xs text-muted-foreground">
            {label ?? "-"}
          </span>
        );
      }
    },
    {
      accessorKey: "request_status",
      header: "Status",
      cell: ({ row }) => (
        <RequestStatusBadge
          status={row.original.request_status}
          isWaiting={isWaitingSchoolRequest(row.original)}
        />
      )
    },
    {
      accessorKey: "created_at",
      header: "Submitted At",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const req = row.original;
        const actionable = req.request_status === 'Pending';
        const feedback = feedbackFor(req.school_request_id);
        if (readOnly || !actionable) {
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">Read-only</span>
              {feedback !== undefined ? (
                <span
                  data-testid="school-request-feedback"
                  className={
                    feedback.tone === "success"
                      ? "text-xs text-emerald-700"
                      : feedback.tone === "stale"
                        ? "text-xs text-amber-700"
                        : "text-xs text-red-600"
                  }
                >
                  {feedback.message}
                </span>
              ) : null}
            </div>
          );
        }
        if (mode === "attendance") {
          return (
            <div className="flex flex-col items-end gap-1">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDecision(req, "reject")}
                  disabled={decisionBusyFor(req.school_request_id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="school-request-reject"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDecision(req, "correct")}
                  disabled={decisionBusyFor(req.school_request_id)}
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  data-testid="school-request-review"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
              {feedback !== undefined ? (
                <span
                  data-testid="school-request-feedback"
                  className={
                    feedback.tone === "success"
                      ? "text-xs text-emerald-700"
                      : feedback.tone === "stale"
                        ? "text-xs text-amber-700"
                        : "text-xs text-red-600"
                  }
                >
                  {feedback.message}
                </span>
              ) : null}
            </div>
          );
        }
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={req.request_status !== 'Pending'}
              onClick={() => handleLegacyReview(req.school_request_id, 'Reject')}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={req.request_status !== 'Pending'}
              onClick={() => handleLegacyReview(req.school_request_id, 'Approve')}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ], [decisionBusyFor, feedbackFor, mode, readOnly]);

  const actionComponent = readOnly ? undefined : (
    <Button onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800 text-white" data-testid="school-request-add">
      <Plus className="mr-2 h-4 w-4" /> Add School Request
    </Button>
  );

  return (
    <div className="space-y-4 pt-4">
      {readOnly ? (
        <p className="text-sm text-muted-foreground" data-testid="school-requests-readonly">
          Read-only mode — decision actions are unavailable.
        </p>
      ) : null}
      <Card className="p-6 border-0 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
        <DataTable
          columns={columns}
          data={requests}
          searchKey="requested_school_name"
          actionComponent={actionComponent}
          emptyTitle="No school requests"
          emptyDescription="There are currently no missing school requests to review."
        />
      </Card>

      <CreateSchoolRequestModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={onCreate}
      />

      {mode === "legacy" ? (
        <ReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          action={reviewAction}
          requestType="School"
          onSubmit={submitReview}
        />
      ) : null}

      {mode === "attendance" ? (
        <SchoolRequestDecisionModal
          open={decisionOpen}
          onOpenChange={setDecisionOpen}
          request={decisionRequest}
          initialTab={decisionTab}
          candidates={decisionRequestId === null ? [] : toDecisionCandidates(candidatesFor(decisionRequestId))}
          candidatesLoading={decisionRequestId === null ? false : candidatesLoadingFor(decisionRequestId)}
          candidatesError={decisionRequestId === null ? null : candidatesErrorFor(decisionRequestId)}
          onRetryCandidates={decisionRequestId === null ? undefined : () => handleRetrySearch(decisionRequestId)}
          onSearch={decisionRequestId === null ? () => undefined : (query) => handleSearch(decisionRequestId, query)}
          mutating={decisionRequestId === null ? false : decisionBusyFor(decisionRequestId)}
          onRoute={handleRoute}
          onGroup={handleGroup}
          onReject={handleDecisionReject}
          onCreatePlaceholder={handleCreatePlaceholder}
        />
      ) : null}
    </div>
  );
}
