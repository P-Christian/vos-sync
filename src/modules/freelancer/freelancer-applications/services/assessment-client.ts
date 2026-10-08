// src/modules/freelancer/freelancer-applications/services/assessment-client.ts
// Browser-side access to the freelancer assessment endpoints. Never import
// from server code; every call runs with the signed session cookie.

import type { AssessmentAttemptDTO } from "@/modules/shared/assessment";
import type {
  ApplicationAssessmentSummary,
  AssessmentIssue,
  AssessmentView,
} from "../types/assessment";
import { summarizeView, type AssessmentDraftEntry } from "./assessment-form";

export class AssessmentRequestError extends Error {
  readonly status: number;
  readonly issues: AssessmentIssue[];

  constructor(message: string, status: number, issues: AssessmentIssue[] = []) {
    super(message);
    this.name = "AssessmentRequestError";
    this.status = status;
    this.issues = issues;
  }
}

interface ErrorPayload {
  error?: unknown;
  issues?: unknown;
}

function parseIssues(payload: unknown): AssessmentIssue[] {
  if (typeof payload !== "object" || payload === null) return [];
  const raw = (payload as ErrorPayload).issues;
  if (!Array.isArray(raw)) return [];
  const issues: AssessmentIssue[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as { job_task_id?: unknown; message?: unknown };
    if (typeof record.message !== "string") continue;
    issues.push({
      job_task_id: typeof record.job_task_id === "number" ? record.job_task_id : null,
      message: record.message,
    });
  }
  return issues;
}

async function responseError(response: Response): Promise<AssessmentRequestError> {
  const payload: unknown = await response.json().catch(() => null);
  const raw = payload && typeof payload === "object" ? (payload as ErrorPayload).error : null;
  const message = typeof raw === "string" ? raw : `Request failed (${response.status}).`;
  return new AssessmentRequestError(message, response.status, parseIssues(payload));
}

export async function getAssessmentView(applicationId: number): Promise<AssessmentView> {
  const response = await fetch(`/api/freelancer/applications/${applicationId}/assessment`, {
    cache: "no-store",
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as AssessmentView;
}

export interface DraftSaveResponse {
  attempt: AssessmentAttemptDTO;
  saved: number;
}

export async function saveAssessmentDraft(
  applicationId: number,
  entries: AssessmentDraftEntry[],
): Promise<DraftSaveResponse> {
  const response = await fetch(`/api/freelancer/applications/${applicationId}/assessment/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses: entries }),
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as DraftSaveResponse;
}

export interface UploadProofResponse {
  proof_file_id: string;
  proof_file_name: string;
  job_task_id: number;
  attempt_id: number;
}

export function uploadAssessmentProof(
  applicationId: number,
  jobTaskId: number,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadProofResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api/freelancer/applications/${applicationId}/assessment/upload`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    request.onerror = () =>
      reject(new AssessmentRequestError("The upload failed. Check your connection and try again.", 0));
    request.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = null;
      }
      if (request.status >= 200 && request.status < 300) {
        resolve(payload as UploadProofResponse);
        return;
      }
      const record = payload && typeof payload === "object" ? (payload as ErrorPayload).error : null;
      const message = typeof record === "string" ? record : `Upload failed (${request.status}).`;
      reject(new AssessmentRequestError(message, request.status, parseIssues(payload)));
    };
    const formData = new FormData();
    formData.append("job_task_id", String(jobTaskId));
    formData.append("file", file);
    request.send(formData);
  });
}

export interface SubmitResponse {
  attempt: AssessmentAttemptDTO;
  already_submitted: boolean;
}

export async function submitFreelancerAssessment(applicationId: number): Promise<SubmitResponse> {
  const response = await fetch(`/api/freelancer/applications/${applicationId}/assessment/submit`, {
    method: "POST",
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as SubmitResponse;
}

/**
 * Read-only eligibility probe for the applications table. Failures are
 * swallowed per application so a single bad row never breaks the list.
 */
export async function fetchAssessmentSummaries(
  applicationIds: number[],
): Promise<Record<number, ApplicationAssessmentSummary>> {
  const summaries: Record<number, ApplicationAssessmentSummary> = {};
  const queue = [...applicationIds];
  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (next === undefined) return;
      const view = await getAssessmentView(next).catch(() => null);
      if (view) summaries[next] = summarizeView(view);
    }
  };
  const workerCount = Math.min(4, queue.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return summaries;
}
