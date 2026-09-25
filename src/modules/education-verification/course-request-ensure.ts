import "server-only";

import { createRow, isDependencyFailure } from "./directus";
import { primitiveError } from "./errors";
import {
  COURSE_REQUEST_FIELDS,
  fetchCourseRequestRows,
} from "./course-request-records";
import { fetchEducationExact } from "./records";
import {
  courseRequestSchema,
  type CourseRequestRecord,
} from "./schemas";
import type { EnsureCourseRequestInput } from "./types";
import { requireNonBlank, requirePositiveInteger } from "./validation";

function exactExisting(
  rows: readonly CourseRequestRecord[],
  input: EnsureCourseRequestInput,
  requesterId: number,
  requestedCourseName: string
): CourseRequestRecord | null {
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
  const existing = exactExisting(
    await fetchCourseRequestRows("employee_education_id", educationId),
    input,
    education.user_id,
    requestedCourseName
  );
  if (existing) return existing;
  try {
    return await createRow(
      "courseRequest.createForEducation",
      "vs_course_request",
      {
        employee_education_id: educationId,
        school_id: schoolId,
        requested_by: education.user_id,
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
    const winner = exactExisting(
      await fetchCourseRequestRows("employee_education_id", educationId),
      input,
      education.user_id,
      requestedCourseName
    );
    if (winner) return winner;
    throw error;
  }
}
