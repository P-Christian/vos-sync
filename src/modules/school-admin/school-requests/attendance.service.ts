import "server-only";

import {
  ensureAttendanceRoster,
  ensureCourseRequest,
  reconcileLinkedEducation,
} from "@/modules/education-verification";
import { claimSchoolAttendance, normalizeRosterAcademics, parseRouteAudit } from "@/modules/school-request-routing";
import { routingError } from "@/modules/school-request-routing/errors";
import { fetchSchoolRequestForSchool, listSchoolRequestInbox } from "./service";
import { invalidInputError } from "./errors";
import { fetchAttendanceRequest, patchAttendanceRequest } from "./attendance.repo";
import { notifyEducationRejection } from "@/lib/notifications/services/education-rejection";
import type {
  AttendanceAcademics,
  AttendanceDecisionInput,
  AttendanceDecisionResult,
  AttendanceRejectionInput,
  AttendanceRejectionResult,
} from "./attendance.types";

function requireId(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw invalidInputError(`${name} must be a positive integer.`);
  return value;
}

function requireClaimTimestamp(value: string | null): string {
  if (value === null || value.trim().length === 0) throw routingError("CLAIM_CONFLICT", "The attendance claim has no persisted timestamp.");
  return value;
}

function claimAcademics(input: AttendanceAcademics | undefined) {
  const value = input ?? {};
  const gpa = value.gpa === null || value.gpa === undefined || value.gpa === "" ? null : Number(value.gpa);
  if (gpa !== null && (!Number.isFinite(gpa) || gpa < 0 || gpa > 5)) {
    throw invalidInputError("GPA must be between 0 and 5.");
  }
  if (value.student_number !== null && value.student_number !== undefined && !/^[A-Za-z0-9][A-Za-z0-9\- ]*$/u.test(String(value.student_number).trim())) {
    throw invalidInputError("student_number has an invalid format.");
  }
  if (value.school_year !== null && value.school_year !== undefined && !/^\d{4}$/u.test(String(value.school_year).trim())) {
    throw invalidInputError("school_year must be a four-digit year.");
  }
  return normalizeRosterAcademics(value);
}

async function finalizeApproval(
  requestId: number,
  schoolId: number,
  reviewerId: number,
  educationId: number,
): Promise<void> {
  const updated = await patchAttendanceRequest(
    "schoolRequest.attendance.finalizeApproval",
    {
      school_request_id: { _eq: requestId },
      matched_school_id: { _eq: schoolId },
      request_status: { _eq: "RoutedToSchool" },
      employee_education_id: { _eq: educationId },
      reviewed_by: { _eq: reviewerId },
      reviewed_at: { _nnull: true },
    },
    { request_status: "Approved" },
  );
  if (updated) return;
  const current = await fetchAttendanceRequest(requestId);
  if (current.request_status === "Approved" && current.reviewed_by === reviewerId) return;
  throw routingError("STALE_CONFLICT", "The school request changed before approval finalized.");
}

async function completeClaimedAttendance(
  request: Awaited<ReturnType<typeof fetchSchoolRequestForSchool>>["row"],
  schoolId: number,
  academics: AttendanceAcademics | undefined,
  useSubmittedAcademics: boolean,
): Promise<AttendanceDecisionResult> {
  const approvalDate = requireClaimTimestamp(request.reviewedAt);
  const educationId = request.education.employeeEducationId;
  const courseId = request.course?.schoolCourseId ?? null;
  const persistedAcademics = claimAcademics(useSubmittedAcademics ? academics : undefined);
  const roster = await ensureAttendanceRoster({
    educationId,
    schoolId,
    courseId,
    approvalDate,
    studentNumber: persistedAcademics.student_number,
    gpa: persistedAcademics.gpa,
    schoolYear: persistedAcademics.school_year,
  });
  const education = await reconcileLinkedEducation({
    mode: "schoolAttendance",
    educationId,
    requesterId: request.requestedBy,
    canonicalSchoolId: schoolId,
    expectedRawSchoolName: request.requestedSchoolName,
    canonicalCourseId: courseId,
  });
  const requestedCourseName =
    education.school_course_id === null ? education.course_name_raw?.trim() ?? "" : "";
  const courseRequest =
    requestedCourseName.length > 0
      ? await ensureCourseRequest({ educationId, schoolId, requestedCourseName })
      : null;
  const courseRequestId = courseRequest?.course_request_id ?? null;
  const reviewerId = request.reviewedBy;
  if (reviewerId === null) throw routingError("CLAIM_CONFLICT", "The attendance claim has no persisted reviewer.");
  await finalizeApproval(request.schoolRequestId, schoolId, reviewerId, educationId);
  if (education.education_status === "Unverified") {
    throw routingError("CORRELATION_CONFLICT", "The reconciled education has an invalid status.");
  }
  return {
    requestId: request.schoolRequestId,
    requestStatus: "Approved",
    educationStatus: education.education_status,
    rosterStudentId: roster.student_id,
    courseRequestId,
    reviewedBy: reviewerId,
    reviewedAt: approvalDate,
  };
}

export async function approveSchoolAttendance(input: AttendanceDecisionInput): Promise<AttendanceDecisionResult> {
  const callerUserId = requireId(input.callerUserId, "callerUserId");
  const requestId = requireId(input.requestId, "requestId");
  const scoped = await fetchSchoolRequestForSchool(callerUserId, requestId);
  const current = await fetchAttendanceRequest(requestId);
  if (current.request_status === "Approved") return completeClaimedAttendance(scoped.row, scoped.assignment.schoolId, undefined, false);
  if (current.request_status !== "RoutedToSchool") throw routingError("STALE_CONFLICT", "Only routed attendance requests can be approved.");
  claimAcademics(input.academics);
  parseRouteAudit(current);
  if (current.employee_education_id === null) throw routingError("CORRELATION_CONFLICT", "The routed request has no linked education.");
  const claimed = await claimSchoolAttendance({
    requestId,
    expectedSchoolId: scoped.assignment.schoolId,
    callerSchoolId: scoped.assignment.schoolId,
    reviewerId: current.reviewed_by ?? callerUserId,
    ...(current.reviewed_by === null || current.reviewed_at === null
      ? {}
      : { replayClaim: { reviewed_by: current.reviewed_by, reviewed_at: current.reviewed_at } }),
  });
  const claimedRow = {
    ...scoped.row,
    reviewedBy: claimed.request.reviewed_by,
    reviewedAt: claimed.request.reviewed_at,
  };
  return completeClaimedAttendance(claimedRow, scoped.assignment.schoolId, claimed.kind === "mutated" ? input.academics : undefined, claimed.kind === "mutated");
}

export async function recoverSchoolAttendance(callerUserId: number): Promise<readonly AttendanceDecisionResult[]> {
  const inbox = await listSchoolRequestInbox(requireId(callerUserId, "callerUserId"));
  const results: AttendanceDecisionResult[] = [];
  for (const row of inbox.finalizing) results.push(await completeClaimedAttendance(row, inbox.schoolId, undefined, false));
  return results;
}

export async function rejectSchoolAttendance(input: AttendanceRejectionInput): Promise<AttendanceRejectionResult> {
  const callerUserId = requireId(input.callerUserId, "callerUserId");
  const requestId = requireId(input.requestId, "requestId");
  const remarks = input.remarks.trim();
  if (remarks.length === 0) throw invalidInputError("Rejection remarks must not be blank.");
  const scoped = await fetchSchoolRequestForSchool(callerUserId, requestId);
  const current = await fetchAttendanceRequest(requestId);
  if (current.request_status === "Rejected" && current.reviewed_by === callerUserId && current.admin_remarks === remarks) {
    return { requestId, requestStatus: "Rejected", reviewedBy: callerUserId, reviewedAt: current.reviewed_at ?? "" };
  }
  parseRouteAudit(current);
  if (current.request_status !== "RoutedToSchool" || current.reviewed_by !== null || current.reviewed_at !== null) {
    throw routingError("CLAIM_CONFLICT", "The routed request is already claimed or finalized.");
  }
  const updated = await patchAttendanceRequest(
    "schoolRequest.attendance.reject",
    {
      school_request_id: { _eq: requestId },
      matched_school_id: { _eq: scoped.assignment.schoolId },
      request_status: { _eq: "RoutedToSchool" },
      reviewed_by: { _null: true },
      reviewed_at: { _null: true },
      active_employee_education_id: { _eq: current.employee_education_id },
    },
    { request_status: "Rejected", admin_remarks: remarks, reviewed_by: callerUserId, reviewed_at: new Date().toISOString(), active_employee_education_id: null },
  );
  if (!updated) throw routingError("CLAIM_CONFLICT", "The rejection lost its guarded race.");
  await notifyEducationRejection({
    kind: "attendance",
    requestId,
    educationId: current.employee_education_id,
    recipientUserId: scoped.row.requestedBy,
    schoolName: scoped.row.requestedSchoolName,
    reason: remarks,
    rejectedBy: "school_admin",
  });
  return { requestId, requestStatus: "Rejected", reviewedBy: callerUserId, reviewedAt: updated.reviewed_at ?? "" };
}
