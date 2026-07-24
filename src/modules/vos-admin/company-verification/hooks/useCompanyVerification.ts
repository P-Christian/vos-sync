"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CompanyVerificationRecord, CompanyVerificationKPIs, VerificationDecisionPayload } from "../types";
import { fetchCompanyVerifications, submitVerificationDecision } from "../services/companyVerification.service";
import { calculateCompanyKPIs, filterCompanyRecords } from "../utils/companyVerification.utils";

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
      const data = await fetchCompanyVerifications(statusFilter, searchQuery);
      setRecords(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load company verifications";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

    setIsSubmitting(true);
    const payload: VerificationDecisionPayload = {
      companyId: selectedCompany.company_id,
      action,
      rejectionReason,
      internalNotes,
    };

    const res = await submitVerificationDecision(payload);
    setIsSubmitting(false);

    if (res.success) {
      // Optimistically update record state in local list
      const newStatus =
        action === "approve"
          ? "VERIFIED"
          : action === "reject"
          ? "REJECTED"
          : action === "request_correction"
          ? "CORRECTION_REQUIRED"
          : "SUSPENDED";

      setRecords((prev) =>
        prev.map((item) =>
          item.company_id === selectedCompany.company_id
            ? {
                ...item,
                verification_status: newStatus,
                rejection_reason: rejectionReason || item.rejection_reason,
                verified_at: action === "approve" ? new Date().toISOString() : item.verified_at,
              }
            : item
        )
      );

      closeRejectionModal();
      closeDetailModal();
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
