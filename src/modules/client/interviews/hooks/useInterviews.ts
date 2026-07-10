// src/modules/client/interviews/hooks/useInterviews.ts
"use client";

import { useState, useCallback } from "react";
import { Interview, InterviewFormData, InterviewStatus } from "../types";

const EMPTY_FORM: InterviewFormData = {
  application_id: "",
  interview_date: "",
  interview_time: "",
  interview_format: "",
  meeting_link: "",
  meeting_location: "",
  interview_notes: "",
};

export function useInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchInterviews = useCallback(async (status?: InterviewStatus | "ALL") => {
    setLoading(true);
    setError("");
    try {
      const q = status && status !== "ALL" ? `?status=${status}` : "";
      const res = await fetch(`/api/client/interviews${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load interviews.");
      setInterviews(json.interviews ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createInterview = useCallback(async (formData: InterviewFormData) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/client/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          application_id: formData.application_id ? Number(formData.application_id) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to schedule interview.");
      if (json.interview)
        setInterviews((prev) => [json.interview as Interview, ...prev]);
      setSuccessMessage("Interview scheduled successfully.");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateInterviewStatus = useCallback(
    async (
      interviewId: number,
      status: InterviewStatus,
      notes?: string
    ) => {
      setSaving(true);
      setError("");
      try {
        const res = await fetch(`/api/client/interviews/${interviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interview_status: status, interview_notes: notes }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update interview.");
        setInterviews((prev) =>
          prev.map((iv) =>
            iv.interview_id === interviewId
              ? { ...iv, interview_status: status }
              : iv
          )
        );
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    interviews,
    loading,
    saving,
    error,
    successMessage,
    fetchInterviews,
    createInterview,
    updateInterviewStatus,
    EMPTY_FORM,
    clearMessages: () => { setError(""); setSuccessMessage(""); },
  };
}

