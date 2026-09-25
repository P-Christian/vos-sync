// src/modules/vos-admin/request-management/services/request.service.ts
import "server-only";

import { z } from "zod";
import {
  claimCourseRequest,
  completeAttendanceRosterCourse,
  fetchActiveCoursesForSchool,
  fetchApprovedAttendanceEvidence,
  finalizeCourseRequest,
  reconcileLinkedEducation,
  VerificationPrimitiveError,
  assertCourseRequestReviewAllowed,
  EducationFlowUnavailableError,
  getEducationVerificationMode,
  type ActiveSchoolCourse,
} from "../../../education-verification";
import { normalizeSchoolIdentity } from "../../../education-verification/validation";
import {
  fetchEducation as fetchRoutingEducation,
  fetchSchoolRequest as fetchRoutingSchoolRequest,
  groupSchoolRequest as groupSchoolRequestPrimitive,
  rejectSchoolRequest as rejectSchoolRequestPrimitive,
  routeSchoolRequest as routeSchoolRequestPrimitive,
  SchoolRequestRoutingError,
  type SchoolRequestRecord,
} from "../../../school-request-routing";
import { fetchRows as fetchRoutingRows, patchRows as patchRoutingRows } from "../../../school-request-routing/directus";
import { SCHOOL_REQUEST_FIELDS, EDUCATION_FIELDS } from "../../../school-request-routing/records";
import { educationSchema as routingEducationSchema, schoolRequestSchema as routingSchoolRequestSchema } from "../../../school-request-routing/schemas";
import {
  fetchRows,
  patchRows,
} from "../../../education-verification/directus";
import type { ReviewCourseRequestDecision } from "../types/request.schema";
import { 
  VsSchoolRequest, 
  VsCourseRequest, 
  ReviewAction 
} from '../types/request.types';
import { 
  fetchSchoolRequestsRepo, 
  fetchCourseRequestsRepo, 
  reviewSchoolRequestRepo, 
  fetchSchoolRequestById,
  fetchCourseRequestById,
  upsertEmployeeEducation,
} from './request.repo';

export async function getSchoolRequests(status?: string): Promise<VsSchoolRequest[]> {
  return fetchSchoolRequestsRepo(status);
}

export async function getCourseRequests(status?: string): Promise<VsCourseRequest[]> {
  return fetchCourseRequestsRepo(status);
}

export interface CourseRequestCandidates {
  readonly requestId: number;
  readonly schoolId: number;
  readonly candidates: readonly ActiveSchoolCourse[];
}

/**
 * Request-scoped Active course candidates derived from the PERSISTED school
 * of the course request. There is intentionally no school-override input:
 * callers cannot ask for another school's catalog through this API.
 */
export async function getCourseRequestCandidates(
  requestId: number,
): Promise<CourseRequestCandidates> {
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw decisionError("INVALID_INPUT", "Course request id must be a positive integer.", 400);
  }
  const link = await fetchCourseRequestLink(requestId);
  let candidates: readonly ActiveSchoolCourse[];
  try {
    candidates = await fetchActiveCoursesForSchool(link.school_id);
  } catch (error: unknown) {
    throw toDecisionError(error, "Course catalog storage is temporarily unavailable.");
  }
  return { requestId: link.course_request_id, schoolId: link.school_id, candidates };
}

export async function reviewSchoolRequest(id: number, data: ReviewAction, adminId: number): Promise<VsSchoolRequest> {
  // Plan 2 Todo 3 quarantine gate: the legacy approve/reject implementation
  // below is reachable ONLY in legacy mode, byte-unchanged. Attendance mode
  // refuses it with a typed unsupported 409; frozen denies it with 503.
  const mode = getEducationVerificationMode();
  if (mode === "frozen") {
    throw new EducationFlowUnavailableError();
  }
  if (mode === "attendance") {
    throw new SchoolRequestRoutingError(
      "UNSUPPORTED_ACTION",
      "Legacy school-request approval is unavailable in attendance mode.",
      409,
    );
  }
  const payload: Partial<VsSchoolRequest> = {
    request_status: data.action,
    reviewed_by: adminId,
    reviewed_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "), // PH Time
  };

  if (data.action === 'Approved') {
    if (!data.matched_school_id) {
      throw new Error("A matched school ID is required when approving a school request.");
    }
    payload.matched_school_id = data.matched_school_id;
  } else if (data.action === 'Rejected') {
    if (!data.admin_remarks || data.admin_remarks.trim() === '') {
      throw new Error("Admin remarks are required when rejecting a school request.");
    }
    payload.admin_remarks = data.admin_remarks;
  }

  await reviewSchoolRequestRepo(id, payload);

  // If approved, upsert the employee education record with the matched school and a null course
  if (data.action === 'Approved' && data.matched_school_id) {
    const originalRequest = await fetchSchoolRequestById(id);
    if (originalRequest && originalRequest.requested_by) {
      // requested_by comes back populated or as ID depending on fields, handle both:
      const userId = typeof originalRequest.requested_by === 'object' 
        ? (originalRequest.requested_by as {user_id: number}).user_id 
        : originalRequest.requested_by;
      
      if (userId) {
        await upsertEmployeeEducation(Number(userId), data.matched_school_id, null);
      }
    }
  }

  // Re-fetch the updated request to ensure we have the populated `requested_by` fields for the UI
  return fetchSchoolRequestById(id);
}

export async function reviewCourseRequest(
  id: number,
  data: ReviewCourseRequestDecision,
  adminId: number,
  options?: CourseReviewOptions,
): Promise<VsCourseRequest> {
  requireVosActor(adminId, options);
  assertCourseRequestReviewAllowed();
  if (!Number.isInteger(id) || id <= 0) {
    throw decisionError("INVALID_INPUT", "Course request id must be a positive integer.", 400);
  }
  switch (data.action) {
    case "Approved": {
      if (!Number.isInteger(data.matched_school_course_id) || data.matched_school_course_id <= 0) {
        throw decisionError("INVALID_INPUT", "A matched course ID is required when approving a course request.", 400);
      }
      return approveCourseRequest(id, data.matched_school_course_id, adminId);
    }
    case "Rejected": {
      if (!data.admin_remarks || data.admin_remarks.trim() === "") {
        throw decisionError("INVALID_INPUT", "Admin remarks are required when rejecting a course request.", 400);
      }
      return rejectCourseRequest(id, data.admin_remarks.trim(), adminId);
    }
    case "RoutedToSchool":
      return routeCourseRequest(id, adminId);
    default:
      throw decisionError("INVALID_INPUT", "Unsupported course request decision.", 400);
  }
}

export type CourseDecisionErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "STATE_CONFLICT"
  | "EVIDENCE_ABSENT"
  | "ROSTER_ABSENT"
  | "AMBIGUOUS"
  | "CORRELATION_CONFLICT"
  | "CLAIM_CONFLICT"
  | "DEPENDENCY_FAILURE";

export class CourseRequestDecisionError extends Error {
  public readonly name = "CourseRequestDecisionError";

  public constructor(
    public readonly code: CourseDecisionErrorCode,
    message: string,
    public readonly status: 400 | 403 | 404 | 409 | 503,
  ) {
    super(message);
  }
}

function decisionError(
  code: CourseDecisionErrorCode,
  message: string,
  status: 400 | 403 | 404 | 409 | 503,
): CourseRequestDecisionError {
  return new CourseRequestDecisionError(code, message, status);
}

export interface CourseReviewOptions {
  /**
   * VOS Admin role id. When present it must be 3 (VOS Admin); otherwise the
   * decision is rejected with 403. The API layer (Todo 5) always supplies it;
   * direct service callers without role context leave it undefined.
   */
  readonly roleId?: number;
}

const VOS_ADMIN_ROLE_ID = 3;

function requireVosActor(adminId: number, options?: CourseReviewOptions): void {
  if (!Number.isInteger(adminId) || adminId <= 0) {
    throw decisionError("INVALID_INPUT", "A valid VOS Admin id is required.", 400);
  }
  if (options?.roleId !== undefined && options.roleId !== VOS_ADMIN_ROLE_ID) {
    throw decisionError("FORBIDDEN", "Course request decisions are restricted to VOS Admins.", 403);
  }
}

function toDecisionError(error: unknown, fallback: string): CourseRequestDecisionError {
  if (error instanceof CourseRequestDecisionError) return error;
  if (error instanceof VerificationPrimitiveError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return decisionError("INVALID_INPUT", error.message, 400);
      case "NOT_FOUND":
        return decisionError("NOT_FOUND", error.message, 404);
      case "DEPENDENCY_FAILURE":
        // Never leak storage internals to the caller.
        return decisionError("DEPENDENCY_FAILURE", "Education verification storage is temporarily unavailable.", 503);
      case "EVIDENCE_ABSENT":
        return decisionError("EVIDENCE_ABSENT", error.message, 409);
      case "ROSTER_ABSENT":
        return decisionError("ROSTER_ABSENT", error.message, 409);
      case "AMBIGUOUS":
        return decisionError("AMBIGUOUS", error.message, 409);
      case "CORRELATION_CONFLICT":
      case "OWNERSHIP_CONFLICT":
        return decisionError("CORRELATION_CONFLICT", error.message, 409);
      case "STALE_CONFLICT":
      case "CLAIM_CONFLICT":
      case "CONCURRENT_CHANGE":
      case "INVALID_ROUTE_AUDIT":
        return decisionError("CLAIM_CONFLICT", error.message, 409);
      default:
        return decisionError("CORRELATION_CONFLICT", error.message, 409);
    }
  }
  return decisionError("DEPENDENCY_FAILURE", fallback, 503);
}

const requesterIdSchema = z
  .union([z.number().int(), z.object({ user_id: z.number().int() })])
  .transform((value) => (typeof value === "number" ? value : value.user_id));

const courseRequestLinkSchema = z.object({
  course_request_id: z.number().int(),
  employee_education_id: z.number().int().nullable(),
  school_id: z.number().int(),
  requested_by: requesterIdSchema,
  requested_course_name: z.string(),
  request_status: z.string(),
  matched_school_course_id: z.number().int().nullable(),
  reviewed_by: z.number().int().nullable(),
  reviewed_at: z.string().nullable(),
  routed_by: z.number().int().nullable(),
  routed_at: z.string().nullable(),
});

type CourseRequestLink = z.infer<typeof courseRequestLinkSchema>;

const COURSE_REQUEST_LINK_FIELDS = [
  "course_request_id",
  "employee_education_id",
  "school_id",
  "requested_by",
  "requested_course_name",
  "request_status",
  "matched_school_course_id",
  "reviewed_by",
  "reviewed_at",
  "routed_by",
  "routed_at",
  "admin_remarks",
].join(",");

const linkedEducationSchema = z.object({
  employee_education_id: z.number().int(),
  user_id: z.number().int(),
  school_id: z.number().int().nullable(),
  school_course_id: z.number().int().nullable(),
  school_name_raw: z.string().nullable(),
  course_name_raw: z.string().nullable(),
  education_status: z.string(),
});

type LinkedEducation = z.infer<typeof linkedEducationSchema>;

const LINKED_EDUCATION_FIELDS = [
  "employee_education_id",
  "user_id",
  "school_id",
  "school_course_id",
  "school_name_raw",
  "course_name_raw",
  "education_status",
  "end_date",
].join(",");

const linkedRosterSchema = z.object({
  student_id: z.number().int(),
  school_id: z.number().int(),
  school_course_id: z.number().int().nullable(),
  employee_education_id: z.number().int().nullable(),
  registered_user_id: z.number().int().nullable(),
});

const LINKED_ROSTER_FIELDS = [
  "student_id",
  "school_id",
  "school_course_id",
  "employee_education_id",
  "registered_user_id",
].join(",");

async function fetchCourseRequestLink(requestId: number): Promise<CourseRequestLink> {
  try {
    const query = new URLSearchParams({
      "filter[course_request_id][_eq]": String(requestId),
      fields: COURSE_REQUEST_LINK_FIELDS,
      limit: "2",
    });
    const rows = await fetchRows(
      "courseRequest.fetchForDecision",
      `/items/vs_course_request?${query.toString()}`,
      courseRequestLinkSchema,
    );
    if (rows.length === 0) {
      throw decisionError("NOT_FOUND", "Course request was not found.", 404);
    }
    if (rows.length > 1 || rows[0] === undefined) {
      throw decisionError("AMBIGUOUS", "Course request rows are ambiguous.", 409);
    }
    return rows[0];
  } catch (error: unknown) {
    throw toDecisionError(error, "Course request storage is temporarily unavailable.");
  }
}

function normalizeCourseName(value: string): string {
  return value.replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US");
}

/**
 * Todo 3's exact-one guarded bind for legacy course requests whose
 * employee_education_id is still null: exactly one Pending education owned by
 * the requester at the request's school may be bound, via a guarded
 * update-multiple PATCH that fails closed on stale or ambiguous state.
 */
async function bindLegacyEducationLink(request: CourseRequestLink): Promise<CourseRequestLink> {
  if (request.employee_education_id !== null) return request;
  let candidates: readonly LinkedEducation[];
  try {
    const query = new URLSearchParams({
      "filter[user_id][_eq]": String(request.requested_by),
      "filter[school_id][_eq]": String(request.school_id),
      "filter[education_status][_eq]": "Pending",
      fields: LINKED_EDUCATION_FIELDS,
      limit: "2",
    });
    candidates = await fetchRows(
      "courseRequest.bindEducationCandidates",
      `/items/vs_employee_education?${query.toString()}`,
      linkedEducationSchema,
    );
  } catch (error: unknown) {
    throw toDecisionError(error, "Education storage is temporarily unavailable.");
  }
  if (candidates.length === 0) {
    throw decisionError(
      "CORRELATION_CONFLICT",
      "The legacy course request has no exact linked education.",
      409,
    );
  }
  if (candidates.length > 1 || candidates[0] === undefined) {
    throw decisionError("AMBIGUOUS", "Candidate educations for this request are ambiguous.", 409);
  }
  const education = candidates[0];
  if (
    education.course_name_raw !== null &&
    normalizeCourseName(education.course_name_raw) !== normalizeCourseName(request.requested_course_name)
  ) {
    throw decisionError(
      "CORRELATION_CONFLICT",
      "The candidate education does not match the requested course.",
      409,
    );
  }
  try {
    const updated = await patchRows(
      {
        operation: "courseRequest.bindEducation",
        collection: "vs_course_request",
        filter: {
          course_request_id: { _eq: request.course_request_id },
          employee_education_id: { _null: true },
          request_status: { _eq: "Pending" },
          matched_school_course_id: { _null: true },
          reviewed_by: { _null: true },
          reviewed_at: { _null: true },
          routed_by: { _null: true },
          routed_at: { _null: true },
        },
        data: { employee_education_id: education.employee_education_id },
        fields: COURSE_REQUEST_LINK_FIELDS,
      },
      courseRequestLinkSchema,
    );
    if (updated) return updated;
  } catch (error: unknown) {
    throw toDecisionError(error, "Course request storage is temporarily unavailable.");
  }
  // Zero rows: the guard went stale. Converge on an exact replay, else conflict.
  const readBack = await fetchCourseRequestLink(request.course_request_id);
  if (
    readBack.request_status === "Pending" &&
    readBack.employee_education_id === education.employee_education_id
  ) {
    return readBack;
  }
  throw decisionError("CLAIM_CONFLICT", "The course request changed before its education could be bound.", 409);
}

async function fetchLinkedEducation(educationId: number): Promise<LinkedEducation> {
  try {
    const query = new URLSearchParams({
      "filter[employee_education_id][_eq]": String(educationId),
      fields: LINKED_EDUCATION_FIELDS,
      limit: "2",
    });
    const rows = await fetchRows(
      "courseRequest.fetchLinkedEducation",
      `/items/vs_employee_education?${query.toString()}`,
      linkedEducationSchema,
    );
    if (rows.length === 0) {
      throw decisionError("NOT_FOUND", "The linked education was not found.", 404);
    }
    if (rows.length > 1 || rows[0] === undefined) {
      throw decisionError("AMBIGUOUS", "Linked education rows are ambiguous.", 409);
    }
    return rows[0];
  } catch (error: unknown) {
    throw toDecisionError(error, "Education storage is temporarily unavailable.");
  }
}

async function approveCourseRequest(
  requestId: number,
  courseId: number,
  adminId: number,
): Promise<VsCourseRequest> {
  // 1. Pending VOS-owned source state (legacy null links bind first), with one
  // exception: an exact replay of an already-converged approval converges
  // through the idempotent finalize instead of conflicting.
  const bound = await bindLegacyEducationLink(await fetchCourseRequestLink(requestId));
  const linkedEducationId = bound.employee_education_id;
  if (linkedEducationId === null) {
    throw decisionError("CORRELATION_CONFLICT", "The course request has no linked education.", 409);
  }
  if (
    bound.request_status === "Approved" &&
    bound.matched_school_course_id === courseId &&
    bound.reviewed_by !== null &&
    bound.reviewed_at !== null
  ) {
    try {
      await finalizeCourseRequest({ requestId, consumer: "vos", action: "Approved", courseId });
    } catch (error: unknown) {
      throw toDecisionError(error, "Course request storage is temporarily unavailable.");
    }
    return readBackCourseRequest(requestId);
  }
  if (bound.request_status !== "Pending") {
    throw decisionError(
      "STATE_CONFLICT",
      `Only Pending course requests accept VOS decisions (current: ${bound.request_status}).`,
      409,
    );
  }
  const request = bound;
  const educationId: number = linkedEducationId;

  // 2. The exact education must exist, belong to the requester/school, and be Pending
  //    (an already-converged Verified row for the same school+course is replay-safe).
  const education = await fetchLinkedEducation(educationId);
  if (education.user_id !== request.requested_by || education.school_id !== request.school_id) {
    throw decisionError(
      "CORRELATION_CONFLICT",
      "The linked education does not belong to this request.",
      409,
    );
  }
  if (education.education_status !== "Pending") {
    const converged =
      education.education_status === "Verified" &&
      education.school_id === request.school_id &&
      education.school_course_id === courseId;
    if (!converged) {
      throw decisionError("STATE_CONFLICT", "Only a Pending linked education may be approved.", 409);
    }
  }

  // 3. The course must be an Active catalog course owned by the request's school.
  //    This validates the catalog only; attendance is never inferred from matching.
  let courseOk = false;
  try {
    const candidates = await fetchActiveCoursesForSchool(request.school_id);
    courseOk = candidates.some((course) => course.school_course_id === courseId);
  } catch (error: unknown) {
    throw toDecisionError(error, "Course catalog storage is temporarily unavailable.");
  }
  if (!courseOk) {
    throw decisionError(
      "CORRELATION_CONFLICT",
      "The selected course is not an Active course of this school.",
      409,
    );
  }

  // 4. Approved attendance evidence for the same school+education is mandatory.
  try {
    await fetchApprovedAttendanceEvidence({ educationId, schoolId: request.school_id });
  } catch (error: unknown) {
    throw toDecisionError(error, "Attendance storage is temporarily unavailable.");
  }

  // 5. Exactly ONE existing linked roster row must already exist. VOS never creates it.
  try {
    const query = new URLSearchParams({
      "filter[employee_education_id][_eq]": String(educationId),
      fields: LINKED_ROSTER_FIELDS,
      limit: "2",
    });
    const rows = await fetchRows(
      "courseRequest.requireRosterRow",
      `/items/vs_school_student?${query.toString()}`,
      linkedRosterSchema,
    );
    if (rows.length === 0) {
      throw decisionError("ROSTER_ABSENT", "No roster row exists for the linked education.", 409);
    }
    if (rows.length > 1 || rows[0] === undefined) {
      throw decisionError("AMBIGUOUS", "Education-linked roster rows are ambiguous.", 409);
    }
    if (rows[0].school_id !== request.school_id) {
      throw decisionError("CORRELATION_CONFLICT", "The roster row belongs to another school.", 409);
    }
  } catch (error: unknown) {
    throw toDecisionError(error, "Roster storage is temporarily unavailable.");
  }

  // 6. Claim matched course + reviewer. Only the winning claim proceeds; any other
  //    VOS Admin may resume the SAME claim (reviewer preserved), while a different
  //    course conflicts with 409.
  try {
    await claimCourseRequest({ requestId, consumer: "vos", reviewerId: adminId, courseId });
  } catch (error: unknown) {
    throw toDecisionError(error, "Course request storage is temporarily unavailable.");
  }

  // 7. Revalidate the persisted claim and the attendance evidence before writing.
  const claimed = await fetchCourseRequestLink(requestId);
  if (
    claimed.request_status !== "Pending" ||
    claimed.matched_school_course_id !== courseId ||
    claimed.reviewed_by === null ||
    claimed.reviewed_at !== null
  ) {
    throw decisionError("CLAIM_CONFLICT", "The persisted claim no longer matches this approval.", 409);
  }
  try {
    await fetchApprovedAttendanceEvidence({ educationId, schoolId: request.school_id });
  } catch (error: unknown) {
    throw toDecisionError(error, "Attendance storage is temporarily unavailable.");
  }

  // 8. Guardedly complete the EXISTING roster row's course (never insert).
  try {
    await completeAttendanceRosterCourse({ educationId, schoolId: request.school_id, courseId });
  } catch (error: unknown) {
    throw toDecisionError(error, "Roster storage is temporarily unavailable.");
  }

  // 9. Reconcile the education to Verified ONLY after roster success.
  try {
    await reconcileLinkedEducation({
      mode: "courseCompletion",
      educationId,
      requesterId: education.user_id,
      canonicalSchoolId: request.school_id,
      canonicalCourseId: courseId,
    });
  } catch (error: unknown) {
    throw toDecisionError(error, "Education storage is temporarily unavailable.");
  }

  // 10. Finalize Approved + review time.
  try {
    await finalizeCourseRequest({ requestId, consumer: "vos", action: "Approved", courseId });
  } catch (error: unknown) {
    throw toDecisionError(error, "Course request storage is temporarily unavailable.");
  }

  return readBackCourseRequest(requestId);
}

async function rejectCourseRequest(
  requestId: number,
  remarks: string,
  adminId: number,
): Promise<VsCourseRequest> {
  // Rejection needs no approval/review/route claim and no attendance evidence,
  // but still requires the VOS-owned Pending source state.
  const request = await fetchCourseRequestLink(requestId);
  if (
    request.request_status !== "Pending" ||
    request.matched_school_course_id !== null ||
    request.reviewed_by !== null ||
    request.reviewed_at !== null ||
    request.routed_by !== null ||
    request.routed_at !== null
  ) {
    // An exact replay by the same reviewer converges; anything else conflicts.
    if (request.request_status === "Rejected" && request.reviewed_by === adminId) {
      return readBackCourseRequest(requestId);
    }
    throw decisionError(
      "STATE_CONFLICT",
      `Only Pending course requests accept VOS decisions (current: ${request.request_status}).`,
      409,
    );
  }
  try {
    await finalizeCourseRequest({
      requestId,
      consumer: "vos",
      action: "Rejected",
      reviewerId: adminId,
      remarks,
    });
  } catch (error: unknown) {
    throw toDecisionError(error, "Course request storage is temporarily unavailable.");
  }
  return readBackCourseRequest(requestId);
}

async function routeCourseRequest(requestId: number, adminId: number): Promise<VsCourseRequest> {
  // Routing needs no approval/review/route claim, but requires Pending source
  // state and writes a non-null VOS actor + time as the manual route audit.
  // A null actor is the explicit SYSTEM-route marker and is never written here.
  const request = await fetchCourseRequestLink(requestId);
  if (
    request.request_status === "RoutedToSchool" &&
    request.routed_by === adminId &&
    request.routed_at !== null
  ) {
    return readBackCourseRequest(requestId);
  }
  if (
    request.request_status !== "Pending" ||
    request.matched_school_course_id !== null ||
    request.reviewed_by !== null ||
    request.reviewed_at !== null ||
    request.routed_by !== null ||
    request.routed_at !== null
  ) {
    throw decisionError(
      "STATE_CONFLICT",
      `Only Pending course requests accept VOS decisions (current: ${request.request_status}).`,
      409,
    );
  }
  try {
    await finalizeCourseRequest({
      requestId,
      consumer: "vos",
      action: "RoutedToSchool",
      reviewerId: adminId,
    });
  } catch (error: unknown) {
    throw toDecisionError(error, "Course request storage is temporarily unavailable.");
  }
  const routed = await readBackCourseRequest(requestId);
  if (routed.routed_by === null || routed.routed_by === undefined || !routed.routed_at) {
    throw decisionError("DEPENDENCY_FAILURE", "Routing did not persist its audit trail.", 503);
  }
  return routed;
}

async function readBackCourseRequest(requestId: number): Promise<VsCourseRequest> {
  try {
    // Re-fetch the updated request to ensure we have the populated
    // `requested_by` fields for the UI.
    return await fetchCourseRequestById(requestId);
  } catch {
    const link = await fetchCourseRequestLink(requestId);
    return {
      course_request_id: link.course_request_id,
      school_id: link.school_id,
      requested_by: link.requested_by,
      requested_course_name: link.requested_course_name,
      request_status: link.request_status as VsCourseRequest["request_status"],
      matched_school_course_id: link.matched_school_course_id,
      reviewed_by: link.reviewed_by,
      reviewed_at: link.reviewed_at,
      routed_by: link.routed_by,
      routed_at: link.routed_at,
      employee_education_id: link.employee_education_id,
      created_at: "",
    };
  }
}

export type SchoolRequestLinkState =
  | "both-null"
  | "equal-linked"
  | "historical-only"
  | "active-only"
  | "mismatched";

export function classifySchoolRequestLink(link: {
  readonly employee_education_id: number | null;
  readonly active_employee_education_id: number | null;
}): SchoolRequestLinkState {
  const historical = link.employee_education_id ?? null;
  const active = link.active_employee_education_id ?? null;
  if (historical === null && active === null) return "both-null";
  if (historical !== null && active !== null) {
    return historical === active ? "equal-linked" : "mismatched";
  }
  return historical !== null ? "historical-only" : "active-only";
}

function requireSchoolRoutingWrite(): void {
  const mode = getEducationVerificationMode();
  if (mode === "frozen") {
    throw new EducationFlowUnavailableError();
  }
  if (mode === "legacy") {
    throw new SchoolRequestRoutingError(
      "UNSUPPORTED_ACTION",
      "Route, Group, and Reject are unavailable in legacy mode.",
      409,
    );
  }
}

function requirePositiveSchoolId(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new SchoolRequestRoutingError("INVALID_INPUT", `${field} must be a positive integer.`, 400);
  }
}

type LegacyBindCandidate = {
  readonly employee_education_id: number;
  readonly user_id: number;
  readonly school_id: number | null;
  readonly school_name_raw: string | null;
  readonly education_status: "Pending" | "Verified" | "Unverified";
};

const LEGACY_BIND_PAGE_SIZE = 100;

async function fetchLegacyBindCandidateSet(requesterId: number): Promise<readonly LegacyBindCandidate[]> {
  const collected: LegacyBindCandidate[] = [];
  let offset = 0;
  for (;;) {
    const query = new URLSearchParams({
      "filter[user_id][_eq]": String(requesterId),
      "filter[school_id][_null]": "true",
      "filter[education_status][_eq]": "Pending",
      fields: EDUCATION_FIELDS,
      limit: String(LEGACY_BIND_PAGE_SIZE),
      offset: String(offset),
    });
    const page = await fetchRoutingRows(
      "schoolRequest.bindEducationCandidates",
      `/items/vs_employee_education?${query.toString()}`,
      routingEducationSchema,
    );
    for (const row of page) collected.push(row);
    if (page.length < LEGACY_BIND_PAGE_SIZE) break;
    offset += LEGACY_BIND_PAGE_SIZE;
  }
  return collected;
}

function normalizeRequestedIdentity(requestedSchoolName: string): string {
  try {
    return normalizeSchoolIdentity(requestedSchoolName);
  } catch {
    throw new SchoolRequestRoutingError("INVALID_INPUT", "The requested school identity is blank.", 400);
  }
}

function candidateMatchesIdentity(candidate: LegacyBindCandidate, normalized: string): boolean {
  const raw = candidate.school_name_raw;
  if (raw === null || raw.trim().length === 0) return false;
  return normalizeSchoolIdentity(raw) === normalized;
}

async function revalidateBoundEducation(
  request: SchoolRequestRecord,
  boundId: number,
  normalized: string,
): Promise<VsSchoolRequest> {
  const education = await fetchRoutingEducation(boundId);
  const raw = education.school_name_raw;
  const consistent =
    education.user_id === request.requested_by &&
    education.education_status === "Pending" &&
    education.school_id === null &&
    raw !== null &&
    raw.trim().length > 0 &&
    normalizeSchoolIdentity(raw) === normalized;
  if (!consistent) {
    throw new SchoolRequestRoutingError(
      "CORRELATION_CONFLICT",
      "The bound education failed revalidation; the request stays bound and Pending.",
      409,
    );
  }
  const again = await fetchLegacyBindCandidateSet(request.requested_by);
  const survivors = again.filter((candidate) => candidateMatchesIdentity(candidate, normalized));
  if (survivors.length !== 1 || survivors[0]?.employee_education_id !== boundId) {
    throw new SchoolRequestRoutingError(
      "CORRELATION_CONFLICT",
      "The education candidate set changed; the request stays bound and Pending.",
      409,
    );
  }
  return fetchSchoolRequestById(request.school_request_id);
}

export async function bindLegacySchoolRequestEducation(requestId: number): Promise<VsSchoolRequest> {
  requireSchoolRoutingWrite();
  requirePositiveSchoolId(requestId, "School request id");
  const request = await fetchRoutingSchoolRequest(requestId);
  if (request.request_status !== "Pending") {
    if (request.request_status === "Rejected" && (request.active_employee_education_id ?? null) === null) {
      throw new SchoolRequestRoutingError(
        "CORRELATION_CONFLICT",
        "The school request was rejected and its active key cleared; upstream may file a new request.",
        409,
      );
    }
    throw new SchoolRequestRoutingError(
      "STALE_CONFLICT",
      "Only Pending school requests accept an education bind.",
      409,
    );
  }
  const state = classifySchoolRequestLink(request);
  if (state === "historical-only" || state === "active-only" || state === "mismatched") {
    throw new SchoolRequestRoutingError(
      "CORRELATION_CONFLICT",
      "The school request education links disagree.",
      409,
    );
  }
  const normalized = normalizeRequestedIdentity(request.requested_school_name);
  if (state === "equal-linked") {
    const boundId = request.employee_education_id;
    if (boundId === null) {
      throw new SchoolRequestRoutingError("CORRELATION_CONFLICT", "The school request education link is missing.", 409);
    }
    return revalidateBoundEducation(request, boundId, normalized);
  }
  const candidates = await fetchLegacyBindCandidateSet(request.requested_by);
  const matched = candidates.filter((candidate) => candidateMatchesIdentity(candidate, normalized));
  if (matched.length === 0) {
    throw new SchoolRequestRoutingError(
      "CORRELATION_CONFLICT",
      "The legacy school request has no exact linked education.",
      409,
    );
  }
  if (matched.length > 1) {
    throw new SchoolRequestRoutingError(
      "CORRELATION_CONFLICT",
      "Candidate educations for this request are ambiguous.",
      409,
    );
  }
  const candidate = matched[0];
  if (candidate === undefined) {
    throw new SchoolRequestRoutingError("CORRELATION_CONFLICT", "The education candidate set is empty.", 409);
  }
  let bound: SchoolRequestRecord | null;
  try {
    bound = await patchRoutingRows(
      {
        operation: "schoolRequest.bindLegacyEducation",
        collection: "vs_school_request",
        filter: {
          school_request_id: { _eq: requestId },
          request_status: { _eq: "Pending" },
          employee_education_id: { _null: true },
          active_employee_education_id: { _null: true },
        },
        data: {
          employee_education_id: candidate.employee_education_id,
          active_employee_education_id: candidate.employee_education_id,
        },
        fields: SCHOOL_REQUEST_FIELDS,
      },
      routingSchoolRequestSchema,
    );
  } catch (error: unknown) {
    if (error instanceof SchoolRequestRoutingError) {
      if (error.code === "DEPENDENCY_FAILURE" || error.code === "NOT_FOUND") {
        throw error;
      }
      throw new SchoolRequestRoutingError(
        "CLAIM_CONFLICT",
        "The education bind conflicted with a concurrent change.",
        409,
      );
    }
    throw error;
  }
  if (bound === null) {
    const current = await fetchRoutingSchoolRequest(requestId);
    if (current.request_status === "Rejected" && current.active_employee_education_id === null) {
      throw new SchoolRequestRoutingError(
        "CORRELATION_CONFLICT",
        "The school request was rejected and its active key cleared; upstream may file a new request.",
        409,
      );
    }
    const currentState = classifySchoolRequestLink(current);
    if (
      currentState === "equal-linked" &&
      current.request_status === "Pending" &&
      current.employee_education_id === candidate.employee_education_id
    ) {
      const boundId = current.employee_education_id;
      if (boundId === null) {
        throw new SchoolRequestRoutingError("STALE_CONFLICT", "The school request changed before its education could be bound.", 409);
      }
      return revalidateBoundEducation(current, boundId, normalized);
    }
    throw new SchoolRequestRoutingError(
      "STALE_CONFLICT",
      "The school request changed before its education could be bound.",
      409,
    );
  }
  return revalidateBoundEducation(bound, candidate.employee_education_id, normalized);
}

export async function routeSchoolRequestDecision(
  requestId: number,
  targetSchoolId: number,
  adminId: number,
): Promise<VsSchoolRequest> {
  requireSchoolRoutingWrite();
  requirePositiveSchoolId(requestId, "School request id");
  requirePositiveSchoolId(targetSchoolId, "Matched school id");
  requirePositiveSchoolId(adminId, "VOS Admin id");
  await bindLegacySchoolRequestEducation(requestId);
  await routeSchoolRequestPrimitive({ requestId, targetSchoolId, actorId: adminId });
  return fetchSchoolRequestById(requestId);
}

export async function groupSchoolRequestDecision(
  requestId: number,
  targetSchoolId: number,
  adminId: number,
): Promise<VsSchoolRequest> {
  requireSchoolRoutingWrite();
  requirePositiveSchoolId(requestId, "School request id");
  requirePositiveSchoolId(targetSchoolId, "Matched school id");
  requirePositiveSchoolId(adminId, "VOS Admin id");
  await bindLegacySchoolRequestEducation(requestId);
  await groupSchoolRequestPrimitive({ requestId, targetSchoolId });
  return fetchSchoolRequestById(requestId);
}

export async function rejectSchoolRequestDecision(
  requestId: number,
  remarks: string,
  adminId: number,
): Promise<VsSchoolRequest> {
  requireSchoolRoutingWrite();
  requirePositiveSchoolId(requestId, "School request id");
  requirePositiveSchoolId(adminId, "VOS Admin id");
  await rejectSchoolRequestPrimitive({ requestId, actorId: adminId, remarks });
  return fetchSchoolRequestById(requestId);
}

