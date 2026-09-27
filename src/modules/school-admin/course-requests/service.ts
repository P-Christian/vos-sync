import "server-only";

import {
  fetchApprovedAttendanceEvidence,
  reconcileLinkedEducation,
  VerificationPrimitiveError,
} from "@/modules/education-verification";
import { fetchEducationExact } from "@/modules/education-verification/records";

import {
  courseRequestError,
  CourseRequestSchoolAdminError,
  dependencyError,
  invalidInputError,
  type CourseRequestSchoolAdminErrorCode,
} from "./errors";
import {
  claimScopedCourseRequest,
  completeScopedRegisteredRosterCourse,
  fetchRosterCoursePrerequisite,
  fetchScopedCourseRequestForDecision,
  fetchScopedTerminalReplay,
  finalizeScopedCourseApproval,
  listActiveCourseCandidates,
  rejectScopedCourseRequest,
  type CourseRequestSchoolContext,
} from "./repo";
import { courseRequestDecisionResultSchema, type ScopedCourseRequestRow } from "./schemas";
import type { CourseRequestDecisionResult } from "./types";

export interface ApproveCourseRequestInput {
  readonly requestId: number;
  readonly courseId: number;
}

export interface RejectCourseRequestInput {
  readonly requestId: number;
  readonly remarks: string;
}

function isCode(error: unknown, code: CourseRequestSchoolAdminErrorCode): boolean {
  return error instanceof CourseRequestSchoolAdminError && error.code === code;
}

function conflict(code: CourseRequestSchoolAdminErrorCode, message: string): never {
  throw courseRequestError(code, message);
}

function requirePositiveId(operation: string, field: string, value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw invalidInputError(`${field} must be a positive integer during ${operation}.`);
  }
  return value;
}

/** Fail closed: transport/config/malformed dependency output is always 503. */
function dependency(operation: string, status?: number, cause?: unknown): never {
  throw dependencyError(operation, status, cause);
}

/**
 * Map a neutral evidence-reader failure to the typed error codes.
 * Absent/ambiguous evidence is a domain conflict; everything else is a
 * sanitized dependency failure.
 */
function mapEvidenceError(operation: string, error: unknown): never {
  if (error instanceof CourseRequestSchoolAdminError) throw error;
  if (error instanceof VerificationPrimitiveError) {
    if (error.code === "EVIDENCE_ABSENT" || error.code === "AMBIGUOUS") {
      conflict("EVIDENCE_CONFLICT", "Approved attendance evidence is missing or ambiguous.");
    }
    dependency(`${operation}.evidence`, error.dependencyStatus, error);
  }
  dependency(`${operation}.evidence`, undefined, error);
}

/**
 * Map a neutral education-reader failure. A missing/ambiguous linked
 * education means the request/education correlation is corrupt (409), never
 * a silent pass; transport failures stay 503.
 */
function mapEducationError(operation: string, error: unknown): never {
  if (error instanceof CourseRequestSchoolAdminError) throw error;
  if (error instanceof VerificationPrimitiveError) {
    if (error.code === "NOT_FOUND" || error.code === "AMBIGUOUS") {
      conflict("STATE_CONFLICT", "The linked education is missing or ambiguous.");
    }
    if (error.code === "INVALID_INPUT") {
      throw invalidInputError(`The linked education lookup received invalid input during ${operation}.`);
    }
    dependency(`${operation}.education`, error.dependencyStatus, error);
  }
  dependency(`${operation}.education`, undefined, error);
}

/**
 * Map a neutral `reconcileLinkedEducation` failure. Ownership/correlation/
 * staleness means a concurrent education change won (409 before any invalid
 * terminal state); vanished evidence maps to EVIDENCE_CONFLICT; transport
 * stays 503.
 */
function mapReconcileError(operation: string, error: unknown): never {
  if (error instanceof CourseRequestSchoolAdminError) throw error;
  if (error instanceof VerificationPrimitiveError) {
    if (
      error.code === "OWNERSHIP_CONFLICT" ||
      error.code === "CORRELATION_CONFLICT" ||
      error.code === "STALE_CONFLICT" ||
      error.code === "NOT_FOUND"
    ) {
      conflict("STATE_CONFLICT", "The linked education changed before approval finalized.");
    }
    if (error.code === "EVIDENCE_ABSENT" || error.code === "AMBIGUOUS") {
      conflict("EVIDENCE_CONFLICT", "Approved attendance evidence is missing or ambiguous.");
    }
    dependency(`${operation}.reconcile`, error.dependencyStatus, error);
  }
  dependency(`${operation}.reconcile`, undefined, error);
}

/** Own-school Active course validation against the allowlisted candidates. */
async function requireActiveOwnCourse(
  operation: string,
  ctx: CourseRequestSchoolContext,
  courseId: number,
): Promise<void> {
  const candidates = await listActiveCourseCandidates(ctx);
  const match = candidates.find((candidate) => candidate.schoolCourseId === courseId);
  if (match === undefined) {
    conflict("COURSE_CONFLICT", "The selected course is not available for this school.");
  }
}

/** Approved same-education/same-school attendance evidence (domain 409 on absence). */
async function requireApprovedEvidence(
  operation: string,
  educationId: number,
  schoolId: number,
): Promise<void> {
  try {
    await fetchApprovedAttendanceEvidence({ educationId, schoolId });
  } catch (error: unknown) {
    mapEvidenceError(operation, error);
  }
}

/**
 * Owner-Registered roster validation. `tolerant` accepts either the
 * not-yet-patched null-course row (fresh approval) or the exact-course row
 * (resume after a roster patch); the post-patch re-read uses the exact
 * course only. Every mismatch fails closed as ROSTER_CONFLICT.
 */
async function requireOwnerRoster(
  operation: string,
  ctx: CourseRequestSchoolContext,
  educationId: number,
  ownerUserId: number,
  courseId: number,
  tolerant: boolean,
): Promise<void> {
  try {
    await fetchRosterCoursePrerequisite(ctx, educationId, ownerUserId, null);
    return;
  } catch (error: unknown) {
    if (!isCode(error, "ROSTER_CONFLICT")) throw error;
    if (!tolerant) throw error;
  }
  await fetchRosterCoursePrerequisite(ctx, educationId, ownerUserId, courseId);
}

function toDecisionResult(
  operation: string,
  row: ScopedCourseRequestRow,
  expectedStatus: "Approved" | "Rejected",
  courseId: number | null,
): CourseRequestDecisionResult {
  if (row.request_status !== expectedStatus) {
    conflict("STATE_CONFLICT", `The course request did not reach ${expectedStatus}.`);
  }
  if (expectedStatus === "Approved" && row.matched_school_course_id !== courseId) {
    conflict("STATE_CONFLICT", "Approval does not match the persisted terminal state.");
  }
  const parsed = courseRequestDecisionResultSchema.safeParse({
    courseRequestId: row.course_request_id,
    requestStatus: row.request_status,
    matchedSchoolCourseId: row.matched_school_course_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    adminRemarks: row.admin_remarks,
  });
  if (!parsed.success) {
    dependency(`${operation}.result`);
  }
  return parsed.data;
}

/**
 * Exact terminal Approved replay convergence. Validates request/education
 * owner equality, Verified education with the SAME school+course, still-
 * matching Approved attendance, and exactly one same-owner Registered
 * roster holding the SAME course. Corruption returns a typed 409, never 200.
 */
async function replayApprovedTerminal(
  ctx: CourseRequestSchoolContext,
  schoolId: number,
  requestId: number,
  courseId: number,
): Promise<CourseRequestDecisionResult> {
  const operation = "courseRequest.approveReplay";
  const terminal = await fetchScopedTerminalReplay(ctx, requestId);
  if (
    terminal.request_status !== "Approved" ||
    terminal.matched_school_course_id !== courseId ||
    terminal.reviewed_at === null
  ) {
    conflict("STATE_CONFLICT", "Approval does not match the persisted terminal state.");
  }
  const ownerUserId = terminal.requested_by;
  const educationId = terminal.employee_education_id;
  let education: Awaited<ReturnType<typeof fetchEducationExact>>;
  try {
    education = await fetchEducationExact(educationId);
  } catch (error: unknown) {
    mapEducationError(operation, error);
  }
  if (education.user_id !== ownerUserId) {
    conflict("STATE_CONFLICT", "The terminal approval owner does not match the linked education.");
  }
  if (
    education.education_status !== "Verified" ||
    education.school_id !== schoolId ||
    education.school_course_id !== courseId
  ) {
    conflict("STATE_CONFLICT", "The linked education does not carry this verified course.");
  }
  await requireApprovedEvidence(operation, educationId, schoolId);
  await fetchRosterCoursePrerequisite(ctx, educationId, ownerUserId, courseId);
  return toDecisionResult(operation, terminal, "Approved", courseId);
}

/**
 * Durable approval saga. Response loss at every boundary resumes to exactly
 * one terminal result by re-invoking with the same inputs: the claim
 * converges without replacing the original reviewer, the roster patch
 * replays exactly, education reconciliation converges on the already-
 * Verified row, and finalization converges on the terminal row.
 */
export async function approveCourseRequest(
  ctx: CourseRequestSchoolContext,
  input: ApproveCourseRequestInput,
): Promise<CourseRequestDecisionResult> {
  const operation = "courseRequest.approve";
  const requestId = requirePositiveId(operation, "requestId", input.requestId);
  const courseId = requirePositiveId(operation, "courseId", input.courseId);
  const schoolId = requirePositiveId(operation, "schoolId", ctx.schoolId);

  // 1. Decision-scoped RoutedToSchool fetch FIRST; ONLY its NOT_FOUND result
  // may trigger the separate scoped terminal-replay fetch.
  let decision: ScopedCourseRequestRow;
  try {
    decision = await fetchScopedCourseRequestForDecision(ctx, requestId);
  } catch (error: unknown) {
    if (isCode(error, "NOT_FOUND")) {
      return replayApprovedTerminal(ctx, schoolId, requestId, courseId);
    }
    throw error;
  }

  // Manual route audit + school scoping were enforced by the decision fetch.
  // A persisted claim for a DIFFERENT course (or any reject/different-course
  // action against this claim) returns 409; an exact same-course claim is a
  // resume that must preserve the original reviewer.
  const isExactResume =
    decision.matched_school_course_id === courseId && decision.reviewed_by !== null;
  if (!isExactResume) {
    if (decision.matched_school_course_id !== null || decision.reviewed_by !== null) {
      conflict("STATE_CONFLICT", "The approval conflicts with the persisted claim.");
    }
  }

  const ownerUserId = decision.requested_by;
  const educationId = decision.employee_education_id;

  // 2. Pre-claim validation: own-school Active course, Approved same-
  // education/school attendance evidence, exact-owner Registered roster
  // (tolerant of an already-patched exact course from a crashed attempt).
  await requireActiveOwnCourse(operation, ctx, courseId);
  await requireApprovedEvidence(operation, educationId, schoolId);
  await requireOwnerRoster(operation, ctx, educationId, ownerUserId, courseId, true);

  // 3. School-scoped claim. On an exact same-course resume the persisted row
  // (with the ORIGINAL reviewer) is returned; the caller never replaces it.
  const claimed = await claimScopedCourseRequest(ctx, {
    requestId,
    courseId,
    reviewerId: ctx.userId,
  });
  const reviewerId = claimed.reviewed_by;
  if (reviewerId === null || claimed.matched_school_course_id !== courseId) {
    conflict("STATE_CONFLICT", "The course request claim conflicts with persisted state.");
  }

  // 4. Scoped claim read-back, then revalidate Active course, evidence, and
  // the owner roster before touching the roster row.
  const readBack = await fetchScopedCourseRequestForDecision(ctx, requestId);
  if (
    readBack.matched_school_course_id !== courseId ||
    readBack.reviewed_by !== reviewerId
  ) {
    conflict("STATE_CONFLICT", "The course request claim changed before roster completion.");
  }
  await requireActiveOwnCourse(operation, ctx, courseId);
  await requireApprovedEvidence(operation, educationId, schoolId);
  await requireOwnerRoster(operation, ctx, educationId, ownerUserId, courseId, true);

  // 5. Owner-and-registration-guarded roster course patch.
  await completeScopedRegisteredRosterCourse(ctx, {
    educationId,
    ownerUserId,
    courseId,
  });

  // 6. IMMEDIATELY re-read the scoped request plus the exact-owner
  // course-bearing roster, and revalidate Active course + evidence. The
  // failure invariant holds here: education is never Verified before this
  // exact roster row carries the selected course.
  let reread: ScopedCourseRequestRow;
  try {
    reread = await fetchScopedCourseRequestForDecision(ctx, requestId);
  } catch (error: unknown) {
    if (isCode(error, "NOT_FOUND")) {
      return replayApprovedTerminal(ctx, schoolId, requestId, courseId);
    }
    throw error;
  }
  if (
    reread.matched_school_course_id !== courseId ||
    reread.reviewed_by !== reviewerId
  ) {
    conflict("STATE_CONFLICT", "The course request claim changed before education reconciliation.");
  }
  await fetchRosterCoursePrerequisite(ctx, educationId, ownerUserId, courseId);
  await requireActiveOwnCourse(operation, ctx, courseId);
  await requireApprovedEvidence(operation, educationId, schoolId);

  // 7. NEUTRAL, REUSED education reconciliation (never modified, never copied).
  try {
    await reconcileLinkedEducation({
      mode: "courseCompletion",
      educationId,
      requesterId: ownerUserId,
      canonicalSchoolId: schoolId,
      canonicalCourseId: courseId,
    });
  } catch (error: unknown) {
    mapReconcileError(operation, error);
  }

  // 8. School-scoped request finalization (converges on an exact terminal
  // Approved replay after response loss) and return the terminal DTO.
  const terminal = await finalizeScopedCourseApproval(ctx, { requestId, courseId });
  return toDecisionResult(operation, terminal, "Approved", courseId);
}

/**
 * Durable rejection. Requires an unclaimed actionable row plus trimmed
 * remarks; converges only when the SAME original reviewer repeats identical
 * trimmed remarks. Education and roster are never written on this path.
 */
export async function rejectCourseRequest(
  ctx: CourseRequestSchoolContext,
  input: RejectCourseRequestInput,
): Promise<CourseRequestDecisionResult> {
  const operation = "courseRequest.reject";
  const requestId = requirePositiveId(operation, "requestId", input.requestId);
  const trimmedRemarks = input.remarks.trim();
  if (trimmedRemarks.length === 0) {
    throw invalidInputError("remarks must be a non-blank string.");
  }

  // Routed-first control flow: ONLY the decision fetch's NOT_FOUND result
  // may trigger the separate scoped terminal-replay fetch.
  try {
    const decision = await fetchScopedCourseRequestForDecision(ctx, requestId);
    if (decision.matched_school_course_id !== null || decision.reviewed_by !== null) {
      conflict("STATE_CONFLICT", "The rejection conflicts with the persisted claim.");
    }
  } catch (error: unknown) {
    if (isCode(error, "NOT_FOUND")) {
      const terminal = await fetchScopedTerminalReplay(ctx, requestId);
      if (
        terminal.request_status === "Rejected" &&
        terminal.reviewed_by === ctx.userId &&
        (terminal.admin_remarks ?? "").trim() === trimmedRemarks
      ) {
        return toDecisionResult(operation, terminal, "Rejected", null);
      }
      conflict("REPLAY_CONFLICT", "The rejection conflicts with the persisted terminal state.");
    }
    throw error;
  }

  const terminal = await rejectScopedCourseRequest(ctx, {
    requestId,
    reviewerId: ctx.userId,
    remarks: trimmedRemarks,
  });
  return toDecisionResult(operation, terminal, "Rejected", null);
}
