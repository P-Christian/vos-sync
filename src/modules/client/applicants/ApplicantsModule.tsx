"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApplicants } from "./hooks/useApplicants";
import ApplicantList from "./components/ApplicantList";
import ApplicantFilters from "./components/ApplicantFilters";
import StatusUpdateDrawer from "./components/StatusUpdateDrawer";
import AssessmentMoveConfirmModal from "./components/AssessmentMoveConfirmModal";
import ApplicantDetailsModal from "./components/ApplicantDetailsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Applicant, ApplicationStatus, AssessmentMoveOutcome, STATUS_LABELS } from "./types";
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
    jobPipeline,
    loading,
    saving,
    error,
    filterStatus,
    setFilterStatus,
    search,
    setSearch,
    fetchApplicants,
    updateStatus,
    updateApplicantStage,
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

  const [gatePending, setGatePending] = useState<{
    applicant: Applicant;
    toStageId: number;
    stageName: string;
    notes: string;
  } | null>(null);
  const [gateConfirming, setGateConfirming] = useState(false);
  const [gateError, setGateError] = useState("");

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
    const counts: Record<string, number> = {
      ALL: rawApplicants.length,
      ACTIVE_PIPELINE: 0,
      APPLIED: 0,
      SCREENING: 0,
      ASSESSMENT: 0,
      INTERVIEW: 0,
      OFFER: 0,
      HIRED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
      // Legacy status keys for fallback compatibility:
      UNDER_REVIEW: 0,
      SHORTLISTED: 0,
      INTERVIEWING: 0,
    };

    for (const a of rawApplicants) {
      const stageType = a.stage_type;
      const isTerminal =
        stageType === "HIRED" ||
        stageType === "REJECTED" ||
        stageType === "WITHDRAWN" ||
        (!stageType && (a.application_status === "HIRED" || a.application_status === "REJECTED" || a.application_status === "WITHDRAWN"));

      if (!isTerminal) {
        counts.ACTIVE_PIPELINE++;
      }

      // Canonical mapping
      if (stageType) {
        if (stageType in counts) counts[stageType]++;
      } else {
        // Fallback for unmigrated legacy status
        if (a.application_status === "APPLIED") counts.APPLIED++;
        else if (a.application_status === "UNDER_REVIEW") counts.SCREENING++;
        else if (a.application_status === "SHORTLISTED") counts.OFFER++;
        else if (a.application_status === "INTERVIEWING") counts.INTERVIEW++;
        else if (a.application_status in counts) counts[a.application_status]++;
      }

      // Keep legacy keys populated if queried
      if (a.application_status in counts) {
        counts[a.application_status]++;
      }

      // Dynamic Job Pipeline Stage count
      if (a.current_stage_id) {
        const stageKey = `STAGE_${a.current_stage_id}`;
        counts[stageKey] = (counts[stageKey] || 0) + 1;
      }
    }
    return counts;
  }, [rawApplicants]);

  useEffect(() => {
    if (effectiveApplicationId) {
      fetchApplicantDetail(effectiveApplicationId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-driven drawer open
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
    setSelectedApplicant(applicant);
    fetchApplicantDetail(applicant.application_id);
    setDetailOpen(true);
  };

  const handleSaveStatus = async (
    applicationId: number,
    status: ApplicationStatus,
    notes: string
  ) => {
    const result = await updateStatus(applicationId, status, notes);
    if (result.gated && result.toStageId !== undefined) {
      const applicant =
        (selectedApplicant?.application_id === applicationId
          ? selectedApplicant
          : rawApplicants.find((a) => a.application_id === applicationId)) ??
        selectedApplicant;
      if (applicant) {
        const routed = await requestStageMove(
          applicant,
          result.toStageId,
          result.stageName ?? "the next stage",
          notes
        );
        if (routed.gated || routed.ok) setDrawerOpen(false);
        return;
      }
    }
    if (result.ok) setDrawerOpen(false);
  };

  const handleSaveStage = async (
    applicationId: number,
    toStageId: number,
    notes: string
  ) => {
    const applicant =
      (selectedApplicant?.application_id === applicationId
        ? selectedApplicant
        : rawApplicants.find((a) => a.application_id === applicationId)) ??
      selectedApplicant;
    if (!applicant) {
      const result = await updateApplicantStage(applicationId, toStageId, notes);
      if (result.ok) setDrawerOpen(false);
      return;
    }
    const targetName =
      applicant.allowed_next_stages?.find((s) => s.id === toStageId)?.stage_name ??
      "the next stage";
    const result = await requestStageMove(applicant, toStageId, targetName, notes);
    if (result.gated || result.ok) setDrawerOpen(false);
  };

  const handleQuickStatusUpdate = async (
    applicant: Applicant,
    newStatus: ApplicationStatus
  ) => {
    const candidateName =
      applicant.applicant_name || `Applicant #${applicant.application_id}`;
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;

    const result = await updateStatus(
      applicant.application_id,
      newStatus,
      applicant.client_notes || ""
    );

    if (result.gated && result.toStageId !== undefined) {
      await requestStageMove(
        applicant,
        result.toStageId,
        result.stageName ?? statusLabel,
        applicant.client_notes || ""
      );
      return;
    }

    if (result.ok) {
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

  const handleQuickStageUpdate = async (
    applicant: Applicant,
    toStageId: number,
    stageName: string
  ) => {
    await requestStageMove(
      applicant,
      toStageId,
      stageName,
      applicant.client_notes || ""
    );
  };

  const performStageMove = async (
    applicant: Applicant,
    toStageId: number,
    stageName: string,
    notes: string,
    outcome?: AssessmentMoveOutcome
  ): Promise<boolean> => {
    const candidateName =
      applicant.applicant_name || `Applicant #${applicant.application_id}`;

    const result = await updateApplicantStage(
      applicant.application_id,
      toStageId,
      notes,
      outcome
    );

    if (!result.ok) {
      toast.error(`Failed to update ${candidateName}'s stage.`);
      return false;
    }
    if (!result.moved) {
      toast.success("Marked as failed — candidate stays at the assessment stage");
      return true;
    }
    toast.success(`${candidateName} moved to ${stageName}`);
    // Plan v3-6: a successful PASS into an INTERVIEW destination lands the recruiter in scheduling.
    const targetStageType = applicant.allowed_next_stages?.find(
      (s) => s.id === toStageId
    )?.stage_type;
    if (targetStageType === "INTERVIEW") {
      handleOpenSchedule(applicant);
    }
    if (applicant.application_id === selectedApplicant?.application_id) {
      setSelectedApplicant((prev) =>
        prev
          ? {
              ...prev,
              current_stage_id: toStageId,
              stage_name: stageName,
            }
          : null
      );
    }
    return true;
  };

  // Routes a stage move through the assessment confirm modal when it leaves
  // an ASSESSMENT stage toward a task-bearing, configured, non-universal
  // target. The server pre-check decides; the PATCH remains authoritative.
  // Never auto-moves: the recorded outcome applies the caller's chosen target.
  const requestStageMove = async (
    applicant: Applicant,
    toStageId: number,
    stageName: string,
    notes: string
  ): Promise<{ gated: boolean; ok: boolean }> => {
    const target = applicant.allowed_next_stages?.find((s) => s.id === toStageId);
    const isUniversalExit =
      target?.stage_type === "REJECTED" || target?.stage_type === "WITHDRAWN";

    if (applicant.stage_type === "ASSESSMENT" && !isUniversalExit) {
      let requiresOutcome = false;
      try {
        const res = await fetch(
          `/api/client/applicants/${applicant.application_id}/stage?to_stage_id=${toStageId}`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => null);
        requiresOutcome = res.ok && json?.requires_outcome === true;
      } catch {
        requiresOutcome = false;
      }
      if (requiresOutcome) {
        clearError();
        setGateError("");
        setGatePending({ applicant, toStageId, stageName, notes });
        return { gated: true, ok: false };
      }
    }

    const ok = await performStageMove(applicant, toStageId, stageName, notes);
    return { gated: false, ok };
  };

  const handleGateConfirm = async (outcome: AssessmentMoveOutcome) => {
    if (!gatePending || gateConfirming) return;
    setGateConfirming(true);
    setGateError("");
    const { applicant, toStageId, stageName, notes } = gatePending;
    const ok = await performStageMove(applicant, toStageId, stageName, notes, outcome);
    setGateConfirming(false);
    if (ok) {
      setGatePending(null);
      setDrawerOpen(false);
    } else {
      setGateError("Failed to record the assessment decision. Please try again.");
    }
  };

  const handleGateCancel = () => {
    if (gateConfirming) return;
    setGatePending(null);
    setGateError("");
  };

  // A requested revision never moves the candidate: it closes the decision
  // modal, then refreshes the list and the open detail so the new
  // IN_PROGRESS attempt surfaces.
  const handleGateRevisionDone = () => {
    const applicationId = gatePending?.applicant.application_id;
    setGatePending(null);
    setGateError("");
    toast.success("Revision requested — candidate stays at the assessment stage");
    fetchApplicants(undefined, jobId);
    if (applicationId !== undefined) {
      if (
        selectedApplicant?.application_id === applicationId ||
        detail?.application_id === applicationId
      ) {
        fetchApplicantDetail(applicationId);
      }
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
      <div className="space-y-4 client-page-transition md:space-y-6">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-zinc-900 to-indigo-950 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-white p-4 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Applicant Management</h1>
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
                className={`h-10 max-md:min-h-10 text-sm px-4 rounded-xl font-bold transition-all md:text-xs ${
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
                <SelectTrigger className="h-10 max-md:min-h-10 max-md:h-10 max-md:px-3 max-md:[&_svg]:size-4 max-md:[&_svg]:opacity-60 text-white bg-white/10 border-white/20 hover:bg-white/15 focus:ring-offset-indigo-950 font-medium rounded-xl">
                  <SelectValue placeholder="Filter by Job Posting" />
                </SelectTrigger>
                <SelectContent className="max-md:max-w-[calc(100vw-2rem)]">
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
            <span className="text-sm font-semibold text-zinc-500 md:text-xs">
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
          <Card className="shadow-lg border border-white/20 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md py-0 gap-0">
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
                pipelineStages={jobPipeline?.stages}
              />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
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
                  onQuickStageUpdate={handleQuickStageUpdate}
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
          onSaveStage={handleSaveStage}
          saving={saving}
          error={drawerOpen ? error : ""}
        />

        {/* Assessment move-time decision */}
        <AssessmentMoveConfirmModal
          open={gatePending !== null}
          applicationId={gatePending?.applicant.application_id ?? null}
          applicantName={
            gatePending?.applicant.applicant_name ??
            (gatePending ? `Applicant #${gatePending.applicant.application_id}` : "")
          }
          fromStageName={gatePending?.applicant.stage_name ?? "the current stage"}
          toStageName={gatePending?.stageName ?? ""}
          confirming={gateConfirming}
          error={gateError}
          onCancel={handleGateCancel}
          onConfirm={handleGateConfirm}
          onRevisionDone={handleGateRevisionDone}
        />

        {/* Schedule Interview Dialog */}
        <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-4xl max-h-[92vh] overflow-y-auto max-md:max-w-[calc(100vw-2rem)] max-md:max-h-[90dvh] max-md:overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Schedule Interview for Candidate</DialogTitle>
            </DialogHeader>
            {scheduleError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm md:text-xs">
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
                className="h-9 max-md:min-h-10 text-sm rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInterview}
                disabled={scheduling}
                className="h-9 max-md:min-h-10 text-sm rounded-lg gap-1.5 bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium"
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
