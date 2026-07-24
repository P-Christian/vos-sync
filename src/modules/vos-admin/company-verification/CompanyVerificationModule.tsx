"use client";

import React, { useState } from "react";
import { useCompanyVerification } from "./hooks/useCompanyVerification";
import {
  CompanyVerificationKpis,
  CompanyVerificationFilters,
  CompanyVerificationTable,
  CompanyVerificationDetailModal,
  RejectionReasonModal,
} from "./components";
import { Building2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompanyVerificationModule() {
  const {
    records,
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
    refetch,
  } = useCompanyVerification();

  const [modalMode, setModalMode] = useState<"reject" | "request_correction">("reject");

  const handleApproveAction = (company: typeof selectedCompany) => {
    if (!company) return;
    if (confirm(`Are you sure you want to APPROVE verification for ${company.company_name}?`)) {
      handleDecision("approve");
    }
  };

  const handleOpenRejection = (company: typeof selectedCompany) => {
    if (!company) return;
    setModalMode("reject");
    openRejectionModal(company);
  };

  const handleOpenCorrection = (company: typeof selectedCompany) => {
    if (!company) return;
    setModalMode("request_correction");
    openRejectionModal(company);
  };

  const handleConfirmRejectionModal = async (
    action: "reject" | "request_correction",
    reason: string,
    internalNotes: string
  ) => {
    await handleDecision(action, reason, internalNotes);
  };

  return (
    <div className="flex flex-col p-6 md:p-8 max-w-[1600px] mx-auto w-full overflow-y-auto h-full min-h-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
    
            <span>Admin Governance & Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Company Verification Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review employer registration applications, verify tax/registration documents, and manage corporate approval status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Stat Cards */}
      <CompanyVerificationKpis
        kpis={kpiData}
        currentFilter={statusFilter}
        onFilterSelect={(status) => setStatusFilter(status)}
      />

      {/* Filter Bar */}
      <CompanyVerificationFilters
        statusFilter={statusFilter}
        onStatusChange={(s) => setStatusFilter(s)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
      />

      {/* Table List */}
      <CompanyVerificationTable
        records={records}
        loading={loading}
        onSelectCompany={(company) => openDetailModal(company)}
      />

      {/* Company Detail Review Drawer / Modal */}
      <CompanyVerificationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => closeDetailModal()}
        company={selectedCompany}
        onApprove={(c) => handleApproveAction(c)}
        onRequestCorrection={(c) => handleOpenCorrection(c)}
        onReject={(c) => handleOpenRejection(c)}
        isSubmitting={isSubmitting}
      />

      {/* Rejection / Correction Modal */}
      <RejectionReasonModal
        isOpen={isRejectionModalOpen}
        onClose={() => closeRejectionModal()}
        company={selectedCompany}
        mode={modalMode}
        onConfirm={handleConfirmRejectionModal}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default CompanyVerificationModule;
