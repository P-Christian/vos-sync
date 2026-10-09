// ASSESSMENT progression gate for transitionApplicationStage. A configured
// (non-universal) move out of a task-bearing ASSESSMENT stage requires a
// move-time assessment_outcome ("PASS" | "FAIL"), which is recorded on the
// latest attempt for (application, job_stage_id) before the move runs.
// Universal REJECTED/WITHDRAWN exits and task-free stages always pass.

import type { JobPipelineStage } from "@/modules/client/pipeline/types";
import { directusList, directusPatch, directusPost, nowPH } from "./directus";

export type AssessmentOutcome = "PASS" | "FAIL";

export function isValidAssessmentOutcome(value: unknown): value is AssessmentOutcome {
  return value === "PASS" || value === "FAIL";
}

/**
 * True when a move out of `fromStage` must carry a move-time assessment
 * outcome: leaving a task-bearing ASSESSMENT stage via a configured
 * (non-universal) transition. Universal exits and task-free stages bypass.
 */
export async function isQualifyingAssessmentMove(input: {
  fromStage: JobPipelineStage;
  isUniversalExit: boolean;
  hasConfiguredTransition: boolean;
}): Promise<boolean> {
  if (input.isUniversalExit) return false;
  if (!input.hasConfiguredTransition) return false;
  if (input.fromStage.stage_type !== "ASSESSMENT") return false;

  const taskParams = new URLSearchParams({
    "filter[job_stage_id][_eq]": String(input.fromStage.id),
    fields: "id",
    limit: "1",
  });
  const taskRows = await directusList("vs_job_pipeline_assessment_tasks", taskParams);
  return taskRows.length > 0;
}

export async function checkAssessmentGate(input: {
  applicationId: number;
  fromStage: JobPipelineStage;
  isUniversalExit: boolean;
  hasConfiguredTransition: boolean;
  assessmentOutcome: unknown;
}): Promise<string | null> {
  let qualifying = false;
  try {
    qualifying = await isQualifyingAssessmentMove({
      fromStage: input.fromStage,
      isUniversalExit: input.isUniversalExit,
      hasConfiguredTransition: input.hasConfiguredTransition,
    });
  } catch (error) {
    console.error("[assessment-review] gate lookup failed:", error);
    return "Assessment progress could not be verified. Please try again.";
  }

  if (!qualifying) return null;
  if (!isValidAssessmentOutcome(input.assessmentOutcome)) {
    return "An assessment decision (Pass or Fail) is required to move this candidate out of the assessment stage.";
  }
  if (input.assessmentOutcome === "FAIL") return null;
  try {
    const attemptParams = new URLSearchParams({
      "filter[application_id][_eq]": String(input.applicationId),
      "filter[job_stage_id][_eq]": String(input.fromStage.id),
      fields: "id,attempt_number,status",
      "sort[]": "-attempt_number",
      limit: "1",
    });
    const attemptRows = await directusList("vs_application_assessment_attempts", attemptParams);
    const latestStatus = attemptRows[0]?.status;
    if (latestStatus !== "SUBMITTED" && latestStatus !== "UNDER_REVIEW") {
      return "This assessment has not been passed (no submission, in progress, or failed). Request a revision or reject the candidate.";
    }
  } catch (error) {
    console.error("[assessment-review] pass guard lookup failed:", error);
    return "Assessment progress could not be verified. Please try again.";
  }
  return null;
}

/**
 * Records the move-time outcome on the latest attempt for
 * (application_id, job_stage_id): sets status to PASSED/FAILED with
 * reviewed_at/reviewed_by. Creates attempt_number 1 in the decided terminal
 * status when no attempt row exists yet.
 */
export async function recordAssessmentMoveOutcome(input: {
  applicationId: number;
  jobStageId: number;
  outcome: AssessmentOutcome;
  reviewedBy: number | null;
}): Promise<string | null> {
  const status = input.outcome === "PASS" ? "PASSED" : "FAILED";
  const reviewedAt = nowPH();
  try {
    const attemptParams = new URLSearchParams({
      "filter[application_id][_eq]": String(input.applicationId),
      "filter[job_stage_id][_eq]": String(input.jobStageId),
      fields: "id,attempt_number,status",
      "sort[]": "-attempt_number",
      limit: "1",
    });
    const attemptRows = await directusList("vs_application_assessment_attempts", attemptParams);
    const latestId = attemptRows[0]?.id;

    if (latestId !== undefined && latestId !== null) {
      const saved = await directusPatch("vs_application_assessment_attempts", Number(latestId), {
        status,
        reviewed_at: reviewedAt,
        reviewed_by: input.reviewedBy,
      });
      if (!saved) return "The assessment decision could not be saved. Please try again.";
      return null;
    }

    const created = await directusPost("vs_application_assessment_attempts", {
      application_id: input.applicationId,
      job_stage_id: input.jobStageId,
      attempt_number: 1,
      predecessor_attempt_id: null,
      status,
      submitted_at: null,
      reviewed_at: reviewedAt,
      reviewed_by: input.reviewedBy,
      review_notes: null,
    });
    if (!created.ok) return "The assessment decision could not be saved. Please try again.";
    return null;
  } catch (error) {
    console.error("[assessment-review] outcome record failed:", error);
    return "The assessment decision could not be saved. Please try again.";
  }
}
