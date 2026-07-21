// src/modules/client/interviews/providers/InterviewsProvider.ts

import { Interview, InterviewFormData, EvaluationFormData, InterviewStatus } from "../types";

const BASE = "/api/client/interviews";

export async function fetchInterviews(status?: InterviewStatus | "ALL"): Promise<Interview[]> {
  const query = status && status !== "ALL" ? `?status=${status}` : "";
  const res = await fetch(`${BASE}${query}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to fetch interviews.");
  }
  return json.interviews ?? [];
}

export async function createInterviewSchedule(data: InterviewFormData): Promise<Interview> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to schedule interview.");
  }
  return json.interview;
}

export async function updateInterviewDetails(
  interviewId: number,
  payload: Partial<InterviewFormData> & { interview_status?: InterviewStatus }
): Promise<void> {
  const res = await fetch(`${BASE}/${interviewId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "DETAILS", payload }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to update interview details.");
  }
}

export async function submitInterviewEvaluation(
  payload: EvaluationFormData
): Promise<void> {
  const res = await fetch(`${BASE}/${payload.interview_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "EVALUATION", payload }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to submit evaluation.");
  }
}
