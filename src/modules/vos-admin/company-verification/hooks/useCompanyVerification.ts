"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CompanyVerificationRecord, CompanyVerificationKPIs, VerificationDecisionPayload, VerificationStatus } from "../types";
import { fetchCompanyVerifications, submitVerificationDecision } from "../services/companyVerification.service";
import { calculateCompanyKPIs, filterCompanyRecords } from "../utils/companyVerification.utils";
import { toast } from "sonner";

export function useCompanyVerification() {
  const [records, setRecords] = useState<CompanyVerificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Detail Modal & Action Modal state
  const [selectedCompany, setSelectedCompany] = useState<CompanyVerificationRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompanyVerifications();
      setRecords(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load company verifications";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetchCompanyVerifications();
        if (isMounted) {
          setRecords(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load company verifications");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Pure filtered dataset
  const filteredRecords = useMemo(() => {
    return filterCompanyRecords(records, statusFilter, searchQuery);
  }, [records, statusFilter, searchQuery]);

  // KPIs derived from raw records
  const kpiData: CompanyVerificationKPIs = useMemo(() => {
    return calculateCompanyKPIs(records);
  }, [records]);

  // Actions
  const openDetailModal = (company: CompanyVerificationRecord) => {
    setSelectedCompany(company);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCompany(null);
  };

  const openRejectionModal = (company: CompanyVerificationRecord) => {
    setSelectedCompany(company);
    setIsRejectionModalOpen(true);
  };

  const closeRejectionModal = () => {
    setIsRejectionModalOpen(false);
  };

  const handleDecision = async (
    action: "approve" | "reject" | "request_correction" | "suspend",
    rejectionReason?: string,
    internalNotes?: string
  ) => {
    if (!selectedCompany) return;

    const companyToUpdate = selectedCompany;
    const previousRecords = records;

    const newStatus: VerificationStatus =
      action === "approve"
        ? "VERIFIED"
        : action === "reject"
        ? "REJECTED"
        : action === "request_correction"
        ? "PENDING_VERIFICATION"
        : "SUSPENDED";

    const newVerifStatus =
      action === "approve"
        ? "APPROVED"
        : action === "reject"
        ? "REJECTED"
        : action === "request_correction"
        ? "CORRECTION_REQUIRED"
        : "SUSPENDED";

    const actionDescription =
      action === "approve"
        ? "approved and marked verified"
        : action === "reject"
        ? "rejected"
        : action === "request_correction"
        ? "marked for correction"
        : "suspended";

    // 1. Instant 0ms Optimistic State Update
    setRecords((prev) =>
      prev.map((item) =>
        item.company_id === companyToUpdate.company_id
          ? {
              ...item,
              verification_status: newStatus,
              rejection_reason: rejectionReason || item.rejection_reason,
              verified_at: action === "approve" ? new Date().toISOString() : item.verified_at,
              latest_verification: {
                id: Date.now(),
                company_id: item.company_id,
                verification_type: "INITIAL_REGISTRATION",
                status: newVerifStatus,
                public_rejection_reason: rejectionReason || null,
                internal_notes: internalNotes || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }
          : item
      )
    );

    // Close modals immediately
    closeRejectionModal();
    closeDetailModal();

    toast.success(`${companyToUpdate.company_name} was ${actionDescription}.`);

    setIsSubmitting(true);
    const payload: VerificationDecisionPayload = {
      companyId: companyToUpdate.company_id,
      action,
      rejectionReason,
      internalNotes,
    };

    try {
      await submitVerificationDecision(payload);
    } catch (err) {
      // 2. Automatic Rollback on failure
      setRecords(previousRecords);
      const msg = err instanceof Error ? err.message : "Failed to update verification status";
      toast.error(`Rollback: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    records: filteredRecords,
    allRecords: records,
    loading,
    error,
    kpiData,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedCompany,
    isDetailModalOpen,
    isRejectionModalOpen,
    isSubmitting,
    openDetailModal,
    closeDetailModal,
    openRejectionModal,
    closeRejectionModal,
    handleDecision,
    refetch: loadData,
  };
}
