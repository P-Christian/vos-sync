"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApplicants } from "./hooks/useApplicants";
import ApplicantList from "./components/ApplicantList";
import ApplicantFilters from "./components/ApplicantFilters";
import StatusUpdateDrawer from "./components/StatusUpdateDrawer";
import ApplicantDetailsModal from "./components/ApplicantDetailsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle  } from "lucide-react";
import { Applicant, ApplicationStatus } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInterviews } from "../interviews/hooks/useInterviews";
import InterviewForm from "../interviews/components/InterviewForm";
import { InterviewFormData } from "../interviews/types";
import CompanyVerificationGuard from "../components/CompanyVerificationGuard";
import { useJobs } from "../jobs/hooks/useJobs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BestMatchesTab from "./components/BestMatchesTab";

interface ApplicantsModuleProps {
  initialApplicationId?: number;
}

export function ApplicantsModuleInner({ initialApplicationId }: ApplicantsModuleProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobIdParam = searchParams.get("job_id");
  const activeTab = searchParams.get("tab") || "applicants";

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
    detail,
    detailLoading,
    detailError,
    fetchApplicantDetail,
    clearDetail,
  } = useApplicants();

  const {
    saving: scheduling,
    error: scheduleError,
    createInterview,
    EMPTY_FORM: EMPTY_INTERVIEW_FORM,
  } = useInterviews();

  const { jobs: allJobs, fetchJobs: fetchAllJobs } = useJobs();

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(() => Boolean(initialApplicationId));
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewFormData, setInterviewFormData] = useState<InterviewFormData>(EMPTY_INTERVIEW_FORM);
  const [interviewErrors, setInterviewErrors] = useState<Partial<Record<keyof InterviewFormData, string>>>({});

  // Sync selectedApplicant from applicants list if initialApplicationId is passed
  const [syncedInitialId, setSyncedInitialId] = useState<number | null>(null);
  if (
    initialApplicationId &&
    applicants.length > 0 &&
    syncedInitialId !== initialApplicationId
  ) {
    const found = applicants.find((a) => a.application_id === initialApplicationId);
    if (found) {
      setSyncedInitialId(initialApplicationId);
      setSelectedApplicant(found);
    }
  }

  useEffect(() => {
    fetchAllJobs();
  }, [fetchAllJobs]);

  const jobId = jobIdParam ? parseInt(jobIdParam, 10) : undefined;

  useEffect(() => {
    fetchApplicants(filterStatus, jobId);
  }, [fetchApplicants, filterStatus, jobId]);

  useEffect(() => {
    if (initialApplicationId) {
      fetchApplicantDetail(initialApplicationId);
    }
  }, [initialApplicationId, fetchApplicantDetail]);

  const handleJobChange = (value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "ALL") {
      params.set("job_id", value);
      if (!params.has("tab")) {
        params.set("tab", "applicants");
      }
    } else {
      params.delete("job_id");
      params.delete("tab");
    }
    router.push(`/vos-sync/client/applicants?${params.toString()}`);
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    router.push(`/vos-sync/client/applicants?${params.toString()}`);
  };

  const selectedJob = allJobs.find((j) => j.job_id === jobId);
  const selectedJobTitle = selectedJob?.job_title || "";

  const handleUpdateStatus = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    clearError();
    setDrawerOpen(true);
  };

  const handleViewDetails = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    fetchApplicantDetail(applicant.application_id);
    setDetailOpen(true);
  };

  const handleSaveStatus = async (
    applicationId: number,
    status: ApplicationStatus,
    notes: string
  ) => {
    const ok = await updateStatus(applicationId, status, notes);
    if (ok) setDrawerOpen(false);
  };

  const handleOpenSchedule = (applicant: Applicant) => {
    setInterviewFormData({
      ...EMPTY_INTERVIEW_FORM,
      application_id: applicant.application_id.toString(),
    });
    setInterviewErrors({});
    setInterviewDialogOpen(true);
  };

  const handleInterviewFieldChange = (field: keyof InterviewFormData, value: string | number) => {
    setInterviewFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveInterview = async () => {
    // Basic frontend validation
    const errors: Partial<Record<keyof InterviewFormData, string>> = {};
    if (!interviewFormData.scheduled_at) errors.scheduled_at = "Scheduled Date & Time is required.";
    if (!interviewFormData.interview_format) errors.interview_format = "Interview format is required.";

    if (Object.keys(errors).length > 0) {
      setInterviewErrors(errors);
      return;
    }

    const ok = await createInterview(interviewFormData);
    if (ok) {
      setInterviewDialogOpen(false);
      fetchApplicants(); // refresh applicant list to show new scheduled status
    }
  };

  const handleViewScheduledInterview = (interviewId: number) => {
    router.push(`/vos-sync/client/interviews?interview_id=${interviewId}`);
  };

  return (
    <CompanyVerificationGuard moduleName="Candidate Applicants">
      <div className="space-y-6 client-page-transition">
        <style>{`
          @keyframes page-entry {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .client-page-transition {
            animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-indigo-950 via-zinc-900 to-neutral-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Applicant Management</h1>
              <p className="text-sm text-zinc-300 mt-1">
                {applicants.length} candidate{applicants.length !== 1 ? "s" : ""} shown
              </p>
            </div>
          </div>

          {/* Job Selector Dropdown */}
          <div className="relative z-10 w-full sm:w-72">
            <Select
              value={jobIdParam || "ALL"}
              onValueChange={handleJobChange}
            >
              <SelectTrigger className="h-10 text-white bg-white/10 border-white/20 hover:bg-white/15 focus:ring-offset-indigo-950 font-medium rounded-xl">
                <SelectValue placeholder="Filter by Job Posting" />
              </SelectTrigger>
              <SelectContent className="max-w-md">
                <SelectItem value="ALL">All Job Postings</SelectItem>
                {allJobs.map((j) => (
                  <SelectItem key={j.job_id} value={String(j.job_id)}>
                    {j.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Banner */}
        {error && !drawerOpen && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Candidates View: Tabs if jobId is selected, else standard list */}
        {jobIdParam ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4 gap-2">
              <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl h-10 w-fit shrink-0">
                <TabsTrigger value="applicants" className="rounded-lg px-4 py-1.5 text-xs font-semibold">
                  All Applicants
                </TabsTrigger>
                <TabsTrigger value="best-matches" className="rounded-lg px-4 py-1.5 text-xs font-semibold gap-1.5">
                
                  Best Matches
                </TabsTrigger>
              </TabsList>
              {selectedJobTitle && (
                <span className="text-xs text-zinc-500 font-semibold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-900/30 truncate max-w-full">
                  Job: {selectedJobTitle}
                </span>
              )}
            </div>

            <TabsContent value="applicants" className="mt-0 outline-none">
              <Card className="shadow-lg border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
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
                    <ApplicantList
                      applicants={applicants}
                      onUpdateStatus={handleUpdateStatus}
                      onScheduleInterview={handleOpenSchedule}
                      onViewScheduledInterview={handleViewScheduledInterview}
                      onViewDetails={handleViewDetails}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="best-matches" className="mt-0 outline-none">
              {selectedJob && (
                <BestMatchesTab
                  job={selectedJob}
                  applicants={applicants}
                  loading={loading}
                  onViewDetails={handleViewDetails}
                  onScheduleInterview={handleOpenSchedule}
                />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="shadow-lg border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
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
                <ApplicantList
                  applicants={applicants}
                  onUpdateStatus={handleUpdateStatus}
                  onScheduleInterview={handleOpenSchedule}
                  onViewScheduledInterview={handleViewScheduledInterview}
                  onViewDetails={handleViewDetails}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Update Dialog */}
        <StatusUpdateDrawer
          applicant={selectedApplicant}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSaveStatus}
          saving={saving}
          error={drawerOpen ? error : ""}
        />

        {/* Schedule Interview Dialog */}
        <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Schedule Interview for Candidate</DialogTitle>
            </DialogHeader>
            {scheduleError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {scheduleError}
              </div>
            )}
            <InterviewForm
              data={interviewFormData}
              onChange={handleInterviewFieldChange}
              errors={interviewErrors}
              disableApplicationId={true}
            />
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setInterviewDialogOpen(false)}
                disabled={scheduling}
                className="h-9 text-sm rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInterview}
                disabled={scheduling}
                className="h-9 text-sm rounded-lg gap-1.5 bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium"
              >
                {scheduling ? "Scheduling..." : "Schedule Interview"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Candidate Details Modal */}
        <ApplicantDetailsModal
          applicant={selectedApplicant}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            clearDetail();
          }}
          onUpdateStatus={() => {
            setDetailOpen(false);
            if (selectedApplicant) handleUpdateStatus(selectedApplicant);
          }}
          onScheduleInterview={() => {
            setDetailOpen(false);
            if (selectedApplicant) handleOpenSchedule(selectedApplicant);
          }}
        />
      </div>
    </CompanyVerificationGuard>
  );
}

export default function ApplicantsModule({ initialApplicationId }: ApplicantsModuleProps = {}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32 gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-zinc-400 animate-pulse">Loading applicant dashboard...</span>
      </div>
    }>
      <ApplicantsModuleInner initialApplicationId={initialApplicationId} />
    </Suspense>
  );
}

