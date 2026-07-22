"use client";

// src/modules/client/interviews/InterviewsModule.tsx

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInterviews } from "./hooks/useInterviews";
import InterviewList from "./components/InterviewList";
import InterviewForm from "./components/InterviewForm";
import InterviewDetailsModal from "./components/InterviewDetailsModal";
import InterviewEvaluationModal from "./components/InterviewEvaluationModal";
import CancelInterviewModal from "./components/CancelInterviewModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarDays, AlertCircle, Plus, Filter, Search } from "lucide-react";
import { Interview, InterviewFormData, InterviewStatus } from "./types";
import { Input } from "@/components/ui/input";

export default function InterviewsModule() {
  const {
    interviews,
    loading,
    saving,
    error,
    successMessage,
    filterStatus,
    setFilterStatus,
    search,
    setSearch,
    loadInterviews,
    createInterview,
    updateStatus,
    saveEvaluation,
    clearMessages,
    EMPTY_FORM,
  } = useInterviews();

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InterviewFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof InterviewFormData, string>>>({});
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [evaluationOpen, setEvaluationOpen] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [interviewToCancel, setInterviewToCancel] = useState<Interview | null>(null);

  const searchParams = useSearchParams();
  const targetInterviewId = searchParams.get("interview_id");

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  useEffect(() => {
    if (targetInterviewId && interviews.length > 0) {
      const match = interviews.find(
        (iv) => iv.interview_id === Number(targetInterviewId)
      );
      if (match) {
        const timer = setTimeout(() => {
          setSelectedInterview(match);
          setDetailsOpen(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [targetInterviewId, interviews]);

  const handleOpenSchedule = () => {
    clearMessages();
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setIsRescheduling(false);
    setScheduleDialogOpen(true);
  };

  const handleOpenReschedule = (interview: Interview) => {
    clearMessages();
    setSelectedInterview(interview);
    // Convert DB scheduled_at string to datetime-local format "YYYY-MM-DDTHH:mm"
    let localDatetime = "";
    if (interview.scheduled_at) {
      const d = new Date(interview.scheduled_at);
      if (!isNaN(d.getTime())) {
        localDatetime = d.toISOString().slice(0, 16);
      }
    }

    setFormData({
      interview_id: String(interview.interview_id),
      application_id: String(interview.application_id),
      scheduled_at: localDatetime,
      duration_minutes: interview.duration_minutes ?? 60,
      timezone: interview.timezone || "Asia/Manila",
      interview_format: interview.interview_format,
      meeting_link: interview.meeting_link || "",
      meeting_location: interview.meeting_location || "",
      interview_notes: interview.interview_notes || "",
      candidate_notes: interview.candidate_notes || "",
    });
    setFormErrors({});
    setIsRescheduling(true);
    setScheduleDialogOpen(true);
  };

  const handleFieldChange = (field: keyof InterviewFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveInterview = async () => {
    const errors: Partial<Record<keyof InterviewFormData, string>> = {};
    if (!isRescheduling && !formData.application_id)
      errors.application_id = "Application ID is required.";
    if (!formData.scheduled_at) errors.scheduled_at = "Scheduled Date & Time is required.";
    if (!formData.interview_format) errors.interview_format = "Interview format is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (isRescheduling && formData.interview_id) {
      const ok = await updateStatus(
        Number(formData.interview_id),
        "RESCHEDULED",
        formData
      );
      if (ok) setScheduleDialogOpen(false);
    } else {
      const ok = await createInterview(formData);
      if (ok) {
        setScheduleDialogOpen(false);
        loadInterviews();
      }
    }
  };

  const handleViewDetails = (interview: Interview) => {
    setSelectedInterview(interview);
    setDetailsOpen(true);
  };

  const handleOpenEvaluation = (interview: Interview) => {
    setSelectedInterview(interview);
    setEvaluationOpen(true);
  };

  const handleOpenCancelModal = (interview: Interview) => {
    setInterviewToCancel(interview);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (interviewId: number, reason: string) => {
    return await updateStatus(interviewId, "CANCELLED", { cancel_reason: reason });
  };

  return (
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
        <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Interview & Screening Workspace</h1>
            <p className="text-sm text-zinc-300 mt-1">
              Schedule candidate interviews, review screening answers, and record evaluations.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenSchedule}
          className="relative z-10 h-10 px-5 text-xs font-semibold rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 shadow-md gap-2"
        >
          <Plus className="h-4 w-4" />
          Schedule Interview
        </Button>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Filter & List Card */}
      <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Interviews List
          </CardTitle>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate / role..."
                className="h-8 pl-8 text-xs rounded-lg"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as InterviewStatus | "ALL")}
                className="h-8 px-2.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="text-sm text-zinc-400">Loading interviews...</span>
            </div>
          ) : (
            <InterviewList
              interviews={interviews}
              onViewDetails={handleViewDetails}
              onOpenEvaluation={handleOpenEvaluation}
              onReschedule={handleOpenReschedule}
              onOpenCancelModal={handleOpenCancelModal}
            />
          )}
        </CardContent>
      </Card>

      {/* Schedule / Reschedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {isRescheduling ? "Reschedule Candidate Interview" : "Schedule New Candidate Interview"}
            </DialogTitle>
          </DialogHeader>

          <InterviewForm
            data={formData}
            onChange={handleFieldChange}
            errors={formErrors}
            disableApplicationId={isRescheduling}
          />

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} disabled={saving} className="h-9 text-xs rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleSaveInterview}
              disabled={saving}
              className="h-9 text-xs rounded-lg bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium"
            >
              {saving
                ? "Saving..."
                : isRescheduling
                ? "Reschedule Interview"
                : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details & Screening Answers Modal */}
      <InterviewDetailsModal
        interview={selectedInterview}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onOpenEvaluation={handleOpenEvaluation}
      />

      {/* Evaluation & Rating Modal */}
      <InterviewEvaluationModal
        interview={selectedInterview}
        open={evaluationOpen}
        saving={saving}
        onClose={() => setEvaluationOpen(false)}
        onSubmitEvaluation={saveEvaluation}
      />

      {/* Cancel Interview Reason Modal */}
      <CancelInterviewModal
        interview={interviewToCancel}
        open={cancelModalOpen}
        saving={saving}
        onClose={() => setCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
}
