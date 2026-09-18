// src/modules/vos-admin/school-verification/hooks/useSchoolVerification.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  SchoolVerificationRecord,
  SchoolVerificationKPIs,
  VerificationDecisionPayload,
} from "../types";
import {
  fetchSchoolVerifications,
  submitSchoolVerificationDecision,
} from "../services/schoolVerification.service";
import { computeSchoolKpis } from "../services/schoolVerification.helpers";

export function useSchoolVerification() {
  const [allRecords, setAllRecords] = useState<SchoolVerificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedSchool, setSelectedSchool] = useState<SchoolVerificationRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchoolVerifications();
      setAllRecords(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load school verifications";
      setError(msg);
      setAllRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSchoolVerifications();
        if (isMounted) {
          setAllRecords(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load school verifications";
          setError(msg);
          setAllRecords([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchRecords();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derive KPI counts from all fetched records
  const kpiData: SchoolVerificationKPIs = useMemo(() => {
    return computeSchoolKpis(allRecords);
  }, [allRecords]);

  // Client-side filtering for fast, smooth table experience
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      // 1. Status filter
      if (statusFilter !== "ALL") {
        const s = String(rec.verification_status || "").toUpperCase();
        if (statusFilter === "PENDING_VERIFICATION") {
          if (s !== "PENDING_VERIFICATION" && s !== "DRAFT" && s !== "CORRECTION_REQUIRED") {
            return false;
          }
        } else if (s !== statusFilter) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (rec.school_name || "").toLowerCase().includes(q);
        const matchesEmail = (rec.school_email || "").toLowerCase().includes(q);
        const matchesCity = (rec.city_municipality || "").toLowerCase().includes(q);
        const matchesProv = (rec.province || "").toLowerCase().includes(q);
        const matchesType = (rec.school_type || "").toLowerCase().includes(q);

        return matchesName || matchesEmail || matchesCity || matchesProv || matchesType;
      }

      return true;
    });
  }, [allRecords, statusFilter, searchQuery]);

  const openDetailModal = (school: SchoolVerificationRecord) => {
    setSelectedSchool(school);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSchool(null);
  };

  const openRejectionModal = (school: SchoolVerificationRecord) => {
    setSelectedSchool(school);
    setIsRejectionModalOpen(true);
  };

  const closeRejectionModal = () => {
    setIsRejectionModalOpen(false);
  };

  const handleDecision = async (
    action: VerificationDecisionPayload["action"],
    rejectionReason?: string,
    internalNotes?: string
  ) => {
    if (!selectedSchool) return;

    setIsSubmitting(true);
    try {
      const res = await submitSchoolVerificationDecision({
        schoolId: selectedSchool.school_id,
        action,
        rejectionReason,
        internalNotes,
      });

      const actionLabels: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        suspend: "suspended",
        request_correction: "returned for correction",
      };

      toast.success(
        res.message || `School "${selectedSchool.school_name}" has been ${actionLabels[action] || "updated"}.`
      );

      // Reload dataset and close modals
      await loadRecords();
      closeRejectionModal();
      closeDetailModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply verification decision";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    records: filteredRecords,
    allRecords,
    loading,
    error,
    kpiData,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedSchool,
    isDetailModalOpen,
    isRejectionModalOpen,
    isSubmitting,
    openDetailModal,
    closeDetailModal,
    openRejectionModal,
    closeRejectionModal,
    handleDecision,
    refetch: loadRecords,
  };
}
