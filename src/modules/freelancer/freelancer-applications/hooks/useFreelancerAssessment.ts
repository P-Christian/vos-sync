// src/modules/freelancer/freelancer-applications/hooks/useFreelancerAssessment.ts
"use client";

import { useCallback, useState } from "react";
import type {
  AssessmentFieldValue,
  AssessmentFieldValues,
  AssessmentIssue,
  AssessmentMutationResult,
  AssessmentView,
} from "../types/assessment";
import {
  AssessmentRequestError,
  getAssessmentView,
  saveAssessmentDraft,
  submitFreelancerAssessment,
  uploadAssessmentProof,
} from "../services/assessment-client";
import {
  buildDraftEntries,
  buildFieldValues,
  validateForSubmit,
} from "../services/assessment-form";

export interface UseFreelancerAssessmentOptions {
  onMutated?: () => void;
}

function issueMap(issues: AssessmentIssue[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const issue of issues) {
    if (issue.job_task_id === null) continue;
    if (map[issue.job_task_id] === undefined) map[issue.job_task_id] = issue.message;
  }
  return map;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== "") return error.message;
  return "Something went wrong. Please try again.";
}

function withoutIssue(
  issues: Record<number, string>,
  jobTaskId: number,
): Record<number, string> {
  if (issues[jobTaskId] === undefined) return issues;
  const next = { ...issues };
  delete next[jobTaskId];
  return next;
}

export function useFreelancerAssessment(
  applicationId: number | null,
  options: UseFreelancerAssessmentOptions = {},
) {
  const { onMutated } = options;
  const [view, setView] = useState<AssessmentView | null>(null);
  const [values, setValues] = useState<AssessmentFieldValues>({});
  const [issues, setIssues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(async () => {
    if (applicationId === null) {
      setView(null);
      setValues({});
      setIssues({});
      setLoadError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const next = await getAssessmentView(applicationId);
      setView(next);
      setValues(buildFieldValues(next));
      setIssues({});
    } catch (error) {
      setView(null);
      setValues({});
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const setFieldValue = useCallback((jobTaskId: number, value: AssessmentFieldValue) => {
    setValues((previous) => ({ ...previous, [jobTaskId]: value }));
    setIssues((previous) => withoutIssue(previous, jobTaskId));
  }, []);

  const saveDraft = useCallback(async (): Promise<AssessmentMutationResult> => {
    if (applicationId === null || view === null) {
      return { ok: false, error: "The assessment is not loaded yet." };
    }
    const entries = buildDraftEntries(view, values);
    if (entries.length === 0) {
      return { ok: false, error: "There is nothing to save yet." };
    }
    setSavingDraft(true);
    try {
      const response = await saveAssessmentDraft(applicationId, entries);
      setView((previous) =>
        previous
          ? { ...previous, status: response.attempt.status, attempt: response.attempt }
          : previous,
      );
      onMutated?.();
      return { ok: true };
    } catch (error) {
      const serverIssues = error instanceof AssessmentRequestError ? error.issues : [];
      if (serverIssues.length > 0) setIssues(issueMap(serverIssues));
      return { ok: false, error: errorMessage(error), issues: serverIssues };
    } finally {
      setSavingDraft(false);
    }
  }, [applicationId, view, values, onMutated]);

  const uploadProof = useCallback(
    async (jobTaskId: number, file: File): Promise<AssessmentMutationResult> => {
      if (applicationId === null) {
        return { ok: false, error: "The assessment is not loaded yet." };
      }
      setUploadingTaskId(jobTaskId);
      setUploadProgress(0);
      try {
        const uploaded = await uploadAssessmentProof(
          applicationId,
          jobTaskId,
          file,
          setUploadProgress,
        );
        setValues((previous) => ({
          ...previous,
          [jobTaskId]: {
            task_type: "FILE_UPLOAD",
            proof_file_id: uploaded.proof_file_id,
            proof_file_name: uploaded.proof_file_name,
          },
        }));
        setIssues((previous) => withoutIssue(previous, jobTaskId));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      } finally {
        setUploadingTaskId(null);
        setUploadProgress(0);
      }
    },
    [applicationId],
  );

  const submit = useCallback(async (): Promise<AssessmentMutationResult> => {
    if (applicationId === null || view === null) {
      return { ok: false, error: "The assessment is not loaded yet." };
    }
    const clientIssues = validateForSubmit(view, values);
    if (clientIssues.length > 0) {
      setIssues(issueMap(clientIssues));
      return {
        ok: false,
        error: "Fix the highlighted tasks before submitting.",
        issues: clientIssues,
      };
    }
    setSubmitting(true);
    try {
      if (view.status === "NOT_STARTED") {
        const entries = buildDraftEntries(view, values);
        if (entries.length === 0) {
          return { ok: false, error: "Complete at least one task before submitting." };
        }
        await saveAssessmentDraft(applicationId, entries);
      }
      await submitFreelancerAssessment(applicationId);
      onMutated?.();
      await load();
      return { ok: true };
    } catch (error) {
      const serverIssues = error instanceof AssessmentRequestError ? error.issues : [];
      if (serverIssues.length > 0) setIssues(issueMap(serverIssues));
      return { ok: false, error: errorMessage(error), issues: serverIssues };
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, view, values, onMutated, load]);

  return {
    view,
    values,
    issues,
    loading,
    loadError,
    savingDraft,
    submitting,
    uploadingTaskId,
    uploadProgress,
    reload: load,
    setFieldValue,
    saveDraft,
    uploadProof,
    submit,
  };
}
