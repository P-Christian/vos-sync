import "server-only";

import { createRow, isDependencyFailure, patchRows } from "./directus";
import { primitiveError } from "./errors";
import {
  COURSE_REQUEST_FIELDS,
  fetchActiveCourseRequestRows,
  fetchCourseRequestRows,
} from "./course-request-records";
import { fetchEducationExact } from "./records";
import {
  courseRequestSchema,
  type CourseRequestRecord,
} from "./schemas";
import type { EnsureCourseRequestInput } from "./types";
import { requireNonBlank, requirePositiveInteger } from "./validation";

function activeExisting(
  rows: readonly CourseRequestRecord[],
  input: EnsureCourseRequestInput,
  requesterId: number,
  requestedCourseName: string
): CourseRequestRecord | null {
  // Lifecycle: at most one live (non-Rejected) request per education. A live
  // row is reused when it correlates; duplicate live rows fail closed instead
  // of silently winning. When every prior row has reached the Rejected
  // terminal there is no live row, so the caller reseats that terminal row
  // back to Pending: the education owns a single unique course-request slot
  // and a second row can never be inserted.
  if (rows.length > 1) {
    throw primitiveError("AMBIGUOUS", "Course requests for this education are ambiguous.");
  }
  const existing = rows[0];
  if (!existing) return null;
  if (
    existing.school_id !== input.schoolId ||
    existing.requested_by !== requesterId ||
    existing.requested_course_name !== requestedCourseName
  ) {
    throw primitiveError(
      "CORRELATION_CONFLICT",
      "The education already has a differently correlated course request."
    );
  }
  return existing;
}

async function convergeLiveRow(
  educationId: number,
  input: EnsureCourseRequestInput,
  requesterId: number,
  requestedCourseName: string
): Promise<CourseRequestRecord | null> {
  return activeExisting(
    await fetchActiveCourseRequestRows(educationId),
    input,
    requesterId,
    requestedCourseName
  );
}

async function reseatRejectedRow(
  candidate: CourseRequestRecord,
  requesterId: number,
  requestedCourseName: string
): Promise<CourseRequestRecord | null> {
  return patchRows(
    {
      operation: "courseRequest.reseatRejected",
      collection: "vs_course_request",
      filter: {
        course_request_id: { _eq: candidate.course_request_id },
        employee_education_id: { _eq: candidate.employee_education_id },
        requested_by: { _eq: requesterId },
        request_status: { _eq: "Rejected" },
      },
      data: {
        requested_course_name: requestedCourseName,
        request_status: "Pending",
        matched_school_course_id: null,
        reviewed_by: null,
        reviewed_at: null,
        admin_remarks: null,
        routed_by: null,
        routed_at: null,
      },
      fields: COURSE_REQUEST_FIELDS,
    },
    courseRequestSchema
  );
}

async function refreshOccupiedSlot(
  rows: readonly CourseRequestRecord[],
  educationId: number,
  input: EnsureCourseRequestInput,
  requesterId: number,
  requestedCourseName: string
): Promise<CourseRequestRecord> {
  const liveRows = rows.filter((row) => row.request_status !== "Rejected");
  if (liveRows.length > 0) {
    const winner = activeExisting(liveRows, input, requesterId, requestedCourseName);
    if (winner) return winner;
    throw primitiveError(
      "CLAIM_CONFLICT",
      "The education already has a course request that is still in progress."
    );
  }
  if (rows.length > 1) {
    throw primitiveError("AMBIGUOUS", "Course requests for this education are ambiguous.");
  }
  const candidate = rows[0];
  if (!candidate || candidate.request_status !== "Rejected") {
    throw primitiveError(
      "CLAIM_CONFLICT",
      "The education already has a course request that is still in progress."
    );
  }
  const reseated = await reseatRejectedRow(candidate, requesterId, requestedCourseName);
  if (reseated) return reseated;
  const winner = await convergeLiveRow(educationId, input, requesterId, requestedCourseName);
  if (winner) return winner;
  throw primitiveError(
    "CLAIM_CONFLICT",
    "Another course request refresh won the education slot."
  );
}

export async function ensureCourseRequest(
  input: EnsureCourseRequestInput
): Promise<CourseRequestRecord> {
  const educationId = requirePositiveInteger(input.educationId, "educationId");
  const schoolId = requirePositiveInteger(input.schoolId, "schoolId");
  const requestedCourseName = requireNonBlank(
    input.requestedCourseName,
    "requestedCourseName"
  );
  const education = await fetchEducationExact(educationId);
  if (education.school_id !== schoolId) {
    throw primitiveError(
      "CORRELATION_CONFLICT",
      "The canonical school does not match the linked education."
    );
  }
  const requesterId = education.user_id;
  const existing = await convergeLiveRow(educationId, input, requesterId, requestedCourseName);
  if (existing) return existing;
  // No live row remains. When only Rejected terminal rows remain, the
  // education-scoped unique slot is still occupied, so the terminal row is
  // reseated to Pending instead of inserting a second row. A lost reseat
  // race re-reads and converges on the winner.
  const priorRows = await fetchCourseRequestRows("employee_education_id", educationId);
  if (priorRows.length > 0) {
    return refreshOccupiedSlot(priorRows, educationId, input, requesterId, requestedCourseName);
  }
  try {
    return await createRow(
      "courseRequest.createForEducation",
      "vs_course_request",
      {
        employee_education_id: educationId,
        school_id: schoolId,
        requested_by: requesterId,
        requested_course_name: requestedCourseName,
        request_status: "Pending",
        matched_school_course_id: null,
        reviewed_by: null,
        reviewed_at: null,
        routed_by: null,
        routed_at: null,
        admin_remarks: null,
      },
      COURSE_REQUEST_FIELDS,
      courseRequestSchema
    );
  } catch (error: unknown) {
    if (!isDependencyFailure(error)) throw error;
    const winner = await convergeLiveRow(educationId, input, requesterId, requestedCourseName);
    if (winner) return winner;
    // A lost creation race means the slot is now occupied. When the winner
    // is a Rejected terminal, reseat it; only a genuinely row-less education
    // rethrows the outage.
    const racedRows = await fetchCourseRequestRows("employee_education_id", educationId);
    if (racedRows.length === 0) throw error;
    return refreshOccupiedSlot(racedRows, educationId, input, requesterId, requestedCourseName);
  }
}
