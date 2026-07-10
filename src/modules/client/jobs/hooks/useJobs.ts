// src/modules/client/jobs/hooks/useJobs.ts
"use client";

import { useState, useCallback } from "react";
import { JobPosting, JobFormData, JobStatus } from "../types";

const EMPTY_FORM: JobFormData = {
  job_title: "",
  job_description: "",
  job_requirements: "",
  job_type: "",
  job_location: "",
  job_department: "",
  salary_min: "",
  salary_max: "",
  salary_negotiable: false,
  experience_level: "",
  status: "ACTIVE",
};

export function useJobs() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<JobStatus | "ALL">("ALL");

  const fetchJobs = useCallback(async (status?: JobStatus | "ALL") => {
    setLoading(true);
    setError("");
    try {
      const q = status && status !== "ALL" ? `?status=${status}` : "";
      const res = await fetch(`/api/client/jobs${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load jobs.");
      setJobs(json.jobs ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = useCallback(async (formData: JobFormData) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/client/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          salary_min: formData.salary_min ? Number(formData.salary_min) : null,
          salary_max: formData.salary_max ? Number(formData.salary_max) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create job.");
      if (json.job) setJobs((prev) => [json.job as JobPosting, ...prev]);
      setSuccessMessage("Job posting created successfully.");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateJob = useCallback(
    async (jobId: number, formData: JobFormData) => {
      setSaving(true);
      setError("");
      setSuccessMessage("");
      try {
        const res = await fetch(`/api/client/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            salary_min: formData.salary_min ? Number(formData.salary_min) : null,
            salary_max: formData.salary_max ? Number(formData.salary_max) : null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update job.");
        if (json.job) {
          setJobs((prev) =>
            prev.map((j) =>
              j.job_id === jobId ? { ...j, ...(json.job as Partial<JobPosting>) } : j
            )
          );
        }
        setSuccessMessage("Job posting updated successfully.");
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

  const closeJob = useCallback(async (jobId: number) => {
    try {
      const res = await fetch(`/api/client/jobs/${jobId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to close job.");
      setJobs((prev) =>
        prev.map((j) => (j.job_id === jobId ? { ...j, status: "CLOSED" as JobStatus } : j))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    }
  }, []);

  return {
    jobs,
    loading,
    saving,
    error,
    successMessage,
    filterStatus,
    setFilterStatus,
    fetchJobs,
    createJob,
    updateJob,
    closeJob,
    EMPTY_FORM,
    clearMessages: () => { setError(""); setSuccessMessage(""); },
  };
}

