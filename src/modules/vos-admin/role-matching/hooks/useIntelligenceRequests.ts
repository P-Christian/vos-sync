"use client";

// src/modules/vos-admin/role-matching/hooks/useIntelligenceRequests.ts

import { useState, useCallback, useEffect } from "react";
import {
  IntelligenceRequest,
  IntelligenceRequestStatus,
  IntelligenceRequestAction,
  ReviewRequestPayload,
} from "../types";
import {
  fetchIntelligenceRequests,
  reviewIntelligenceRequest,
} from "../services/roleMatchingService";

export function useIntelligenceRequests(initialStatus?: IntelligenceRequestStatus) {
  const [requests, setRequests] = useState<IntelligenceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStatus, setActiveStatus] = useState<IntelligenceRequestStatus | undefined>(
    initialStatus
  );

  const loadRequests = useCallback(
    async (status?: IntelligenceRequestStatus) => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchIntelligenceRequests(status);
        setRequests(data);
        setActiveStatus(status);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to load intelligence requests.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const approveRequest = useCallback(
    async (
      suggestionId: number,
      payload: Omit<ReviewRequestPayload, "action">
    ): Promise<boolean> => {
      try {
        await reviewIntelligenceRequest(suggestionId, "APPROVE" as IntelligenceRequestAction, payload);
        // Update local state — mark as APPROVED with resolution type
        setRequests((prev) =>
          prev.map((r) =>
            r.suggestion_id === suggestionId
              ? {
                  ...r,
                  status: "APPROVED",
                  resolution_type: payload.resolution_type || "CREATED_NEW",
                  resolved_category_id: payload.existing_category_id ?? r.resolved_category_id,
                  admin_remarks: payload.admin_remarks ?? r.admin_remarks,
                }
              : r
          )
        );
        return true;
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to approve request.");
        return false;
      }
    },
    []
  );

  const rejectRequest = useCallback(
    async (suggestionId: number, adminRemarks: string): Promise<boolean> => {
      try {
        await reviewIntelligenceRequest(suggestionId, "REJECT" as IntelligenceRequestAction, {
          admin_remarks: adminRemarks,
          resolution_type: "REJECTED",
        });
        // Update local state — mark as REJECTED with resolution_type
        setRequests((prev) =>
          prev.map((r) =>
            r.suggestion_id === suggestionId
              ? {
                  ...r,
                  status: "REJECTED",
                  resolution_type: "REJECTED",
                  admin_remarks: adminRemarks,
                }
              : r
          )
        );
        return true;
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to reject request.");
        return false;
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      await loadRequests(activeStatus);
      if (!isMounted) return;
    })();
    return () => {
      isMounted = false;
    };
  }, [loadRequests, activeStatus]);

  return {
    requests,
    loading,
    error,
    activeStatus,
    loadRequests,
    approveRequest,
    rejectRequest,
  };
}
