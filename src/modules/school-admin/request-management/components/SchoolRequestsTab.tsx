// src/modules/school-admin/request-management/components/SchoolRequestsTab.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Plus, Check, X } from "lucide-react";
import { VsSchoolRequest, ReviewAction } from "../types/request.types";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { ReviewModal } from "./ReviewModal";
import { CreateSchoolRequestModal } from "./CreateSchoolRequestModal";
import { Button } from "@/components/ui/button";
import { DataTable } from "./new-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";

interface Props {
  requests: VsSchoolRequest[];
  onCreate: (data: unknown) => Promise<boolean>;
  onReview: (id: number, data: ReviewAction) => Promise<boolean>;
}

export function SchoolRequestsTab({ requests, onCreate, onReview }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Reject' | null>(null);

  const handleReview = (id: number, action: 'Approve' | 'Reject') => {
    setSelectedRequest(id);
    setReviewAction(action);
    setReviewOpen(true);
  };

  const submitReview = async (data: ReviewAction) => {
    if (!selectedRequest) return false;
    return await onReview(selectedRequest, data);
  };

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
      accessorKey: "request_status",
      header: "Status",
      cell: ({ row }) => <RequestStatusBadge status={row.original.request_status} />
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
        return (
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={req.request_status !== 'Pending'}
              onClick={() => handleReview(req.school_request_id, 'Reject')}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={req.request_status !== 'Pending'}
              onClick={() => handleReview(req.school_request_id, 'Approve')}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ], []);

  const actionComponent = (
    <Button onClick={() => setCreateOpen(true)} className="bg-blue-700 hover:bg-blue-800 text-white">
      <Plus className="mr-2 h-4 w-4" /> Add School Request
    </Button>
  );

  return (
    <div className="space-y-4 pt-4">
      <Card className="p-6 border-0 shadow-sm bg-white rounded-xl">
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

      <ReviewModal 
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        action={reviewAction}
        requestType="School"
        onSubmit={submitReview}
      />
    </div>
  );
}
