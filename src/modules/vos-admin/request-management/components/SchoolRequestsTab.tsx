// School-request table composition. Wires the shared column builder and the
// per-request decision/review controller to the request rows for the current
// mode. Frozen renders data with zero mutation controls; attendance and
// legacy delegate every action to the controller, which scopes each decision
// to one concrete school request.
"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { VsSchoolRequest, ReviewAction } from "../types/request.types";
import type { SchoolDraftOutcome } from "../types/request.types";
import type {
  SchoolDecisionFeedback,
  SchoolDecisionOutcome,
  SchoolRequestDecision,
  SchoolRoutingCandidate,
} from "../hooks/useRequests";
import { CreateSchoolRequestModal } from "./CreateSchoolRequestModal";
import { Button } from "@/components/ui/button";
import { DataTable } from "./new-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { buildSchoolRequestColumns } from "./school-requests/school-request-columns";
import { useSchoolRequestActionController } from "./school-requests/SchoolRequestActionController";
import type { SchoolRequestsMode } from "./school-requests/school-request-mode";

export type { SchoolRequestsMode } from "./school-requests/school-request-mode";

interface Props {
  requests: VsSchoolRequest[];
  mode: SchoolRequestsMode;
  /** Repurposed Add action: guarded normalized draft-school creation. */
  onCreate: (data: unknown) => Promise<SchoolDraftOutcome | null>;
  /** Guarded draft-school creation from the decision dialog. */
  onCreatePlaceholder: (data: unknown) => Promise<SchoolDraftOutcome | null>;
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
  const readOnly = mode === "frozen";

  const controller = useSchoolRequestActionController({
    mode,
    onReview,
    onDecide,
    onSearchSchools,
    candidatesFor,
    candidatesLoadingFor,
    candidatesErrorFor,
    decisionBusyFor,
    onCreatePlaceholder,
    onDecided,
  });

  const columns = useMemo<ColumnDef<VsSchoolRequest>[]>(
    () =>
      buildSchoolRequestColumns({
        mode,
        readOnly,
        feedbackFor,
        decisionBusyFor,
        onOpenDecision: controller.openDecision,
        onOpenLegacyReview: controller.openLegacyReview,
      }),
    [mode, readOnly, feedbackFor, decisionBusyFor, controller.openDecision, controller.openLegacyReview],
  );

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

      {controller.modals}
    </div>
  );
}
