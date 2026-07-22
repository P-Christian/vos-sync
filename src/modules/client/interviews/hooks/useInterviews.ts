"use client";

// src/modules/client/interviews/hooks/useInterviews.ts

import { useCallback, useMemo, useState } from "react";
import {
  Interview,
  InterviewFormData,
  EvaluationFormData,
  InterviewStatus,
} from "../types";
import {
  fetchInterviews,
  createInterviewSchedule,
  updateInterviewDetails,
  submitInterviewEvaluation,
} from "../providers/InterviewsProvider";

import { toast } from "sonner";

export const EMPTY_FORM: InterviewFormData = {
  application_id: "",
  scheduled_at: "",
  duration_minutes: 60,
  timezone: "Asia/Manila",
  interview_format: "",
  meeting_link: "",
  meeting_location: "",
  interview_notes: "",
  candidate_notes: "",
};

export function useInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [filterStatus, setFilterStatus] = useState<InterviewStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const loadInterviews = useCallback(async (status?: InterviewStatus | "ALL") => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInterviews(status);
      setInterviews(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createInterview = useCallback(async (data: InterviewFormData) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await createInterviewSchedule(data);
      const msg = "Interview scheduled successfully.";
      setSuccessMessage(msg);
      toast.success(msg);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to schedule interview.";
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (
      interviewId: number,
      status: InterviewStatus,
      extra?: Partial<InterviewFormData> & { cancel_reason?: string }
    ) => {
      setSaving(true);
      setError("");
      setSuccessMessage("");
      try {
        await updateInterviewDetails(interviewId, {
          interview_status: status,
          ...extra,
        });
        setInterviews((prev) =>
          prev.map((item) =>
            item.interview_id === interviewId
              ? {
                  ...item,
                  interview_status: status,
                  scheduled_at: extra?.scheduled_at ?? item.scheduled_at,
                  duration_minutes: extra?.duration_minutes ?? item.duration_minutes,
                  timezone: extra?.timezone ?? item.timezone,
                  meeting_link: extra?.meeting_link ?? item.meeting_link,
                  meeting_location: extra?.meeting_location ?? item.meeting_location,
                  cancel_reason: extra?.cancel_reason ?? item.cancel_reason,
                }
              : item
          )
        );
        const msg = `Interview status updated to ${status}.`;
        setSuccessMessage(msg);
        toast.success(msg);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update interview.";
        setError(msg);
        toast.error(msg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const saveEvaluation = useCallback(async (payload: EvaluationFormData) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await submitInterviewEvaluation(payload);
      setInterviews((prev) =>
        prev.map((item) =>
          item.interview_id === payload.interview_id
            ? {
                ...item,
                evaluation_score: payload.evaluation_score,
                feedback: payload.feedback,
                interview_status: "COMPLETED",
                application_status:
                  payload.decision === "HIRED"
                    ? "HIRED"
                    : payload.decision === "REJECTED"
                    ? "REJECTED"
                    : item.application_status,
              }
            : item
        )
      );
      const msg = "Evaluation recorded successfully.";
      setSuccessMessage(msg);
      toast.success(msg);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save evaluation.";
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const filteredInterviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return interviews.filter((item) => {
      const matchesStatus =
        filterStatus === "ALL" || item.interview_status === filterStatus;
      if (!matchesStatus) return false;
      if (!query) return true;

      return (
        item.applicant_name?.toLowerCase().includes(query) ||
        item.job_title?.toLowerCase().includes(query) ||
        item.meeting_location?.toLowerCase().includes(query)
      );
    });
  }, [interviews, filterStatus, search]);

  return {
    interviews: filteredInterviews,
    rawInterviews: interviews,

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

    clearMessages: () => {
      setError("");
      setSuccessMessage("");
    },

    EMPTY_FORM,
  };
}
