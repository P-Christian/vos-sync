/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApplicants } from "./hooks/useApplicants";
import ApplicantList from "./components/ApplicantList";
import ApplicantFilters from "./components/ApplicantFilters";
import StatusUpdateDrawer from "./components/StatusUpdateDrawer";
import ApplicantDetailsModal from "./components/ApplicantDetailsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Applicant, ApplicantFilterStatus, ApplicationStatus, STATUS_LABELS } from "./types";
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
import BestMatchesTab from "./components/BestMatchesTab";

interface ApplicantsModuleProps {
  initialApplicationId?: number;
}

export function ApplicantsModuleInner({ initialApplicationId }: ApplicantsModuleProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobIdParam = searchParams.get("job_id");
  const tabParam = searchParams.get("tab");
  const applicantIdParam =
    searchParams.get("applicantId") ||
    searchParams.get("applicant_id") ||
    searchParams.get("applicationId") ||
    searchParams.get("application_id") ||
    searchParams.get("id");

  const effectiveApplicationId =
    initialApplicationId || (applicantIdParam ? parseInt(applicantIdParam, 10) : undefined);

  const [showBestMatches, setShowBestMatches] = useState<boolean>(tabParam === "best-matches");

  useEffect(() => {
    if (tabParam === "best-matches") {
      queueMicrotask(() => setShowBestMatches(true));
    }
  }, [tabParam]);

  const {
    applicants,
    rawApplicants,
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
    interviews,
    loadInterviews,
    saving: scheduling,
    error: scheduleError,
    createInterview,
    EMPTY_FORM: EMPTY_INTERVIEW_FORM,
  } = useInterviews();

  const { jobs: allJobs, fetchJobs: fetchAllJobs } = useJobs();

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(() => Boolean(effectiveApplicationId));
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewFormData, setInterviewFormData] = useState<InterviewFormData>(EMPTY_INTERVIEW_FORM);
  const [interviewErrors, setInterviewErrors] = useState<Partial<Record<keyof InterviewFormData, string>>>({});

  // Sync selectedApplicant from applicants list if effectiveApplicationId is passed
  const [syncedInitialId, setSyncedInitialId] = useState<number | null>(null);
  if (
    effectiveApplicationId &&
    applicants.length > 0 &&
    syncedInitialId !== effectiveApplicationId
  ) {
    const found = applicants.find((a) => a.application_id === effectiveApplicationId);
    if (found) {
      setSyncedInitialId(effectiveApplicationId);
      setSelectedApplicant(found);
    }
  }

  useEffect(() => {
    fetchAllJobs();
  }, [fetchAllJobs]);

  const jobId = jobIdParam ? parseInt(jobIdParam, 10) : undefined;

  useEffect(() => {
    fetchApplicants(undefined, jobId);
  }, [fetchApplicants, jobId]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<ApplicantFilterStatus, number> = {
      ACTIVE_PIPELINE: 0,
      ALL: rawApplicants.length,
      APPLIED: 0,
      UNDER_REVIEW: 0,
      SHORTLISTED: 0,
      INTERVIEWING: 0,
      HIRED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };
    for (const a of rawApplicants) {
      if (a.application_status in counts) {
        counts[a.application_status]++;
      }
      if (
        a.application_status === "APPLIED" ||
        a.application_status === "UNDER_REVIEW" ||
        a.application_status === "SHORTLISTED" ||
        a.application_status === "INTERVIEWING"
      ) {
        counts.ACTIVE_PIPELINE++;
      }
    }
    return counts;
  }, [rawApplicants]);

  useEffect(() => {
    if (effectiveApplicationId) {
      fetchApplicantDetail(effectiveApplicationId);
      setDetailOpen(true);
    }
  }, [effectiveApplicationId, fetchApplicantDetail]);

  const handleJobChange = (value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "ALL") {
      params.set("job_id", value);
    } else {
      params.delete("job_id");
      params.delete("tab");
      setShowBestMatches(false);
    }
    router.push(`/vos-sync/client/applicants?${params.toString()}`);
  };

  const toggleBestMatches = () => {
    const nextState = !showBestMatches;
    setShowBestMatches(nextState);
    const params = new URLSearchParams(window.location.search);
    if (nextState) {
      params.set("tab", "best-matches");
    } else {
      params.delete("tab");
    }
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
    if (applicant.application_status === "APPLIED") {
      setSelectedApplicant({ ...applicant, application_status: "UNDER_REVIEW" });
    } else {
      setSelectedApplicant(applicant);
    }
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

  const handleQuickStatusUpdate = async (
    applicant: Applicant,
    newStatus: ApplicationStatus
  ) => {
    const candidateName =
      applicant.applicant_name || `Applicant #${applicant.application_id}`;
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;

    const ok = await updateStatus(
      applicant.application_id,
      newStatus,
      applicant.client_notes || ""
    );

    if (ok) {
      toast.success(`${candidateName} moved to ${statusLabel}`);
      if (applicant.application_id === selectedApplicant?.application_id) {
        setSelectedApplicant((prev) =>
          prev ? { ...prev, application_status: newStatus } : null
        );
      }
    } else {
      toast.error(`Failed to update ${candidateName}'s status.`);
    }
  };

  const handleOpenSchedule = (applicant: Applicant) => {
    loadInterviews();
    setInterviewFormData({
      ...EMPTY_INTERVIEW_FORM,
      application_ids: [applicant.application_id],
    });
    setInterviewErrors({});
    setInterviewDialogOpen(true);
  };

  const handleInterviewFieldChange = (field: keyof InterviewFormData, value: unknown) => {
    setInterviewFormData((prev) => ({ ...prev, [field]: value }));
    if (interviewErrors[field]) {
      setInterviewErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveInterview = async () => {
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
      fetchApplicants(undefined, jobId);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-zinc-900 to-indigo-950 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
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

          {/* Action Toolbar & Job Selector */}
          <div className="flex flex-wrap items-center justify-end gap-3 relative z-10 w-full sm:w-auto">
            {/* Best Match AI Action Button */}
            {selectedJob && (
              <Button
                onClick={toggleBestMatches}
                variant={showBestMatches ? "secondary" : "default"}
                className={`h-10 text-xs px-4 rounded-xl font-bold transition-all ${
                  showBestMatches
                    ? "bg-white text-zinc-900 hover:bg-zinc-100"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                }`}
              >
                {showBestMatches ? (
                  <span className="flex items-center gap-1.5">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All Applicants
                  </span>
                ) : (
                  "Best Match AI"
                )}
              </Button>
            )}

            {/* Job Selector Dropdown */}
            <div className="w-full sm:w-auto sm:min-w-[220px]">
              <Select value={jobIdParam || "ALL"} onValueChange={handleJobChange}>
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
        </div>

        {/* Error Banner */}
        {error && !drawerOpen && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Selected Job Sub-Header if filter applied */}
        {selectedJobTitle && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-500">
              Filtering candidates for: <strong className="text-zinc-800 dark:text-zinc-200">{selectedJobTitle}</strong>
            </span>
          </div>
        )}

        {/* Main Content Area */}
        {showBestMatches && selectedJob ? (
          <BestMatchesTab
            job={selectedJob}
            applicants={applicants}
            loading={loading}
            onViewDetails={handleViewDetails}
            onScheduleInterview={handleOpenSchedule}
          />
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
                counts={statusCounts}
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
                  onQuickStatusUpdate={handleQuickStatusUpdate}
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
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Schedule Interview for Candidate</DialogTitle>
            </DialogHeader>
            {scheduleError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {scheduleError}
              </div>
            )}
            <InterviewForm
              data={interviewFormData}
              onChange={handleInterviewFieldChange}
              errors={interviewErrors}
              disableApplicationId={true}
              existingInterviews={interviews}
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32 gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-zinc-400 animate-pulse">Loading applicant dashboard...</span>
        </div>
      }
    >
      <ApplicantsModuleInner initialApplicationId={initialApplicationId} />
    </Suspense>
  );
}
