// src/modules/client/applicants/ApplicantsModule.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useApplicants } from "./hooks/useApplicants";
import ApplicantList from "./components/ApplicantList";
import ApplicantFilters from "./components/ApplicantFilters";
import StatusUpdateDrawer from "./components/StatusUpdateDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle } from "lucide-react";
import { Applicant, ApplicationStatus } from "./types";

export default function ApplicantsModule() {
  const {
    applicants,
    loading,
    saving,
    error,
    filterStatus,
    setFilterStatus,
    search,
    setSearch,
    fetchApplicants,
    updateStatus,
    clearError,
  } = useApplicants();

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const handleUpdateStatus = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    clearError();
    setDrawerOpen(true);
  };

  const handleSaveStatus = async (
    applicationId: number,
    status: ApplicationStatus,
    notes: string
  ) => {
    const ok = await updateStatus(applicationId, status, notes);
    if (ok) setDrawerOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900 text-white p-6 rounded-3xl border shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/10">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Applicant Management</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {applicants.length} candidate{applicants.length !== 1 ? "s" : ""} shown
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && !drawerOpen && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filters + List */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-zinc-800 dark:text-zinc-100 mb-3">
            Candidates
          </CardTitle>
          <ApplicantFilters
            search={search}
            onSearchChange={setSearch}
            status={filterStatus}
            onStatusChange={setFilterStatus}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-zinc-400 animate-pulse">Loading candidates...</span>
            </div>
          ) : (
            <ApplicantList applicants={applicants} onUpdateStatus={handleUpdateStatus} />
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <StatusUpdateDrawer
        applicant={selectedApplicant}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveStatus}
        saving={saving}
        error={drawerOpen ? error : ""}
      />
    </div>
  );
}

