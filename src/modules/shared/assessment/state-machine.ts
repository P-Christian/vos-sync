// Pure attempt lifecycle transitions. No I/O, no clock reads inside
// transitions: callers pass timestamps explicitly for determinism.

import type {
  AssessmentAttempt,
  AttemptAction,
  AttemptStatus,
  PersistedAttemptStatus,
  ReviewDecision,
} from "./types";

export class AssessmentTransitionError extends Error {
  readonly code:
    | "ILLEGAL_TRANSITION"
    | "IMMUTABLE"
    | "CONFLICT"
    | "PRECONDITION";
  constructor(
    code: "ILLEGAL_TRANSITION" | "IMMUTABLE" | "CONFLICT" | "PRECONDITION",
    message: string,
  ) {
    super(message);
    this.name = "AssessmentTransitionError";
    this.code = code;
  }
}

export function deriveAttemptStatus(
  attempt: AssessmentAttempt | null,
): AttemptStatus {
  if (attempt === null) return "NOT_STARTED";
  return attempt.status;
}

export function isImmutableStatus(status: AttemptStatus): boolean {
  switch (status) {
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "PASSED":
    case "FAILED":
    case "NEEDS_REVISION":
      return true;
    case "NOT_STARTED":
    case "IN_PROGRESS":
      return false;
  }
}

export function canEditResponse(status: AttemptStatus): boolean {
  return status === "NOT_STARTED" || status === "IN_PROGRESS";
}

export function createInitialAttempt(input: {
  id: number;
  application_id: number;
  job_stage_id: number;
}): AssessmentAttempt {
  return {
    id: input.id,
    application_id: input.application_id,
    job_stage_id: input.job_stage_id,
    attempt_number: 1,
    predecessor_attempt_id: null,
    status: "IN_PROGRESS",
    submitted_at: null,
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
  };
}

export function saveDraftStatus(
  current: PersistedAttemptStatus,
): PersistedAttemptStatus {
  if (current === "IN_PROGRESS") return "IN_PROGRESS";
  throw new AssessmentTransitionError(
    "IMMUTABLE",
    `draft save forbidden from ${current}`,
  );
}

export function submitAttemptStatus(
  current: PersistedAttemptStatus,
): PersistedAttemptStatus {
  if (current === "IN_PROGRESS") return "SUBMITTED";
  if (current === "SUBMITTED") return "SUBMITTED";
  throw new AssessmentTransitionError(
    current === "UNDER_REVIEW" ||
      current === "PASSED" ||
      current === "FAILED" ||
      current === "NEEDS_REVISION"
      ? "IMMUTABLE"
      : "ILLEGAL_TRANSITION",
    `submit forbidden from ${current}`,
  );
}

export function beginReviewStatus(
  current: PersistedAttemptStatus,
): PersistedAttemptStatus {
  if (current === "SUBMITTED") return "UNDER_REVIEW";
  if (current === "UNDER_REVIEW") return "UNDER_REVIEW";
  throw new AssessmentTransitionError(
    current === "PASSED" || current === "FAILED" || current === "NEEDS_REVISION"
      ? "IMMUTABLE"
      : "ILLEGAL_TRANSITION",
    `begin review forbidden from ${current}`,
  );
}

export function resolveReviewStatus(
  current: PersistedAttemptStatus,
  decision: ReviewDecision,
): PersistedAttemptStatus {
  if (current === "UNDER_REVIEW") return decision;
  if (current === decision) return current;
  // Revision stays available after a failed outcome: a FAILED attempt may
  // be reopened as NEEDS_REVISION (one linked IN_PROGRESS successor is then
  // created by the review service). PASSED stays terminal.
  if (current === "FAILED" && decision === "NEEDS_REVISION") {
    return "NEEDS_REVISION";
  }
  // Revision may be requested straight from a submitted attempt that was
  // never explicitly put UNDER_REVIEW. The review service still creates
  // exactly one linked successor (predecessor_attempt_id, responses copied)
  // and repeat requests stay idempotent.
  if (current === "SUBMITTED" && decision === "NEEDS_REVISION") {
    return "NEEDS_REVISION";
  }
  if (
    current === "PASSED" ||
    current === "FAILED" ||
    current === "NEEDS_REVISION"
  ) {
    throw new AssessmentTransitionError(
      "CONFLICT",
      `conflicting review repeat: ${current} vs ${decision}`,
    );
  }
  throw new AssessmentTransitionError(
    "ILLEGAL_TRANSITION",
    `review decision forbidden from ${current}`,
  );
}

export function applyAttemptAction(
  current: PersistedAttemptStatus | null,
  action: AttemptAction,
): PersistedAttemptStatus {
  if (current === null) {
    if (action === "SAVE_DRAFT") return "IN_PROGRESS";
    throw new AssessmentTransitionError(
      "PRECONDITION",
      `action ${action} requires an existing attempt`,
    );
  }
  switch (action) {
    case "SAVE_DRAFT":
      return saveDraftStatus(current);
    case "SUBMIT":
      return submitAttemptStatus(current);
    case "BEGIN_REVIEW":
      return beginReviewStatus(current);
    case "MARK_PASSED":
      return resolveReviewStatus(current, "PASSED");
    case "MARK_FAILED":
      return resolveReviewStatus(current, "FAILED");
    case "REQUEST_REVISION":
      return resolveReviewStatus(current, "NEEDS_REVISION");
    default: {
      const unreachable: never = action;
      throw new AssessmentTransitionError(
        "ILLEGAL_TRANSITION",
        `unknown action ${unreachable}`,
      );
    }
  }
}

export function createRevisionAttempt(
  current: AssessmentAttempt,
  nextId: number,
): AssessmentAttempt {
  if (current.status !== "NEEDS_REVISION") {
    throw new AssessmentTransitionError(
      "PRECONDITION",
      `revision attempt requires NEEDS_REVISION, got ${current.status}`,
    );
  }
  return {
    id: nextId,
    application_id: current.application_id,
    job_stage_id: current.job_stage_id,
    attempt_number: current.attempt_number + 1,
    predecessor_attempt_id: current.id,
    status: "IN_PROGRESS",
    submitted_at: null,
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
  };
}
