import "server-only";

import { ensureCourseRequest } from "./course-request-ensure";
import {
  COURSE_REQUEST_FIELDS,
  fetchCourseRequestRows,
} from "./course-request-records";
import { patchRows } from "./directus";
import { primitiveError } from "./errors";
import { courseRequestSchema, type CourseRequestRecord } from "./schemas";

export type SyncVerifiedCourseRequestInput = {
  readonly educationId: number;
  readonly schoolId: number | null;
  readonly requesterId: number;
  readonly requestedCourseName: string | null;
  readonly courseChanged: boolean;
};

function exactRequest(
  rows: readonly CourseRequestRecord[]
): CourseRequestRecord | null {
  if (rows.length > 1) {
    throw primitiveError("AMBIGUOUS", "Course requests for this education are ambiguous.");
  }
  return rows[0] ?? null;
}

function requireCorrelated(
  request: CourseRequestRecord,
  input: SyncVerifiedCourseRequestInput
): void {
  if (
    request.employee_education_id !== input.educationId ||
    request.requested_by !== input.requesterId ||
    request.school_id !== input.schoolId
  ) {
    throw primitiveError(
      "CORRELATION_CONFLICT",
      "The existing course request does not match this education."
    );
  }
}

function pendingCourseData(
  requestedCourseName: string
): Readonly<Record<string, unknown>> {
  return {
    requested_course_name: requestedCourseName,
    request_status: "Pending",
    matched_school_course_id: null,
    reviewed_by: null,
    reviewed_at: null,
    routed_by: null,
    routed_at: null,
    admin_remarks: null,
  };
}

function isConverged(
  request: CourseRequestRecord,
  requestedCourseName: string
): boolean {
  return (
    request.request_status === "Pending" &&
    request.requested_course_name === requestedCourseName &&
    request.matched_school_course_id === null &&
    request.reviewed_by === null &&
    request.reviewed_at === null &&
    request.routed_by === null &&
    request.routed_at === null &&
    request.admin_remarks === null
  );
}

async function resetExistingRequest(
  request: CourseRequestRecord,
  requestedCourseName: string
): Promise<CourseRequestRecord> {
  const updated = await patchRows(
    {
      operation: "courseRequest.syncVerifiedCourseChange",
      collection: "vs_course_request",
      filter: {
        course_request_id: { _eq: request.course_request_id },
        employee_education_id: { _eq: request.employee_education_id },
        requested_by: { _eq: request.requested_by },
        school_id: { _eq: request.school_id },
        request_status: { _eq: request.request_status },
      },
      data: pendingCourseData(requestedCourseName),
      fields: COURSE_REQUEST_FIELDS,
    },
    courseRequestSchema
  );
  if (updated) return updated;

  const current = exactRequest(
    await fetchCourseRequestRows("employee_education_id", request.employee_education_id)
  );
  if (current && isConverged(current, requestedCourseName)) return current;
  if (current?.request_status === "Approved") {
    throw primitiveError(
      "CLAIM_CONFLICT",
      "This course is already approved. Add a new education record for a different course."
    );
  }
  throw primitiveError(
    "STALE_CONFLICT",
    "The course request changed before the new course could be saved."
  );
}

export async function syncVerifiedCourseRequest(
  input: SyncVerifiedCourseRequestInput
): Promise<CourseRequestRecord | null> {
  const existing = exactRequest(
    await fetchCourseRequestRows("employee_education_id", input.educationId)
  );
  if (existing) requireCorrelated(existing, input);
  if (!input.courseChanged) return existing;

  if (existing?.request_status === "Approved") {
    throw primitiveError(
      "CLAIM_CONFLICT",
      "This course is already approved. Add a new education record for a different course."
    );
  }
  if (existing && input.requestedCourseName === null) {
    throw primitiveError(
      "INVALID_INPUT",
      "Select another course; an existing course request cannot be cleared."
    );
  }
  if (input.requestedCourseName === null) return null;
  if (existing) return resetExistingRequest(existing, input.requestedCourseName);
  if (input.schoolId === null) {
    throw primitiveError(
      "INVALID_INPUT",
      "A verified education must have a canonical school before requesting a course."
    );
  }
  return ensureCourseRequest({
    educationId: input.educationId,
    schoolId: input.schoolId,
    requestedCourseName: input.requestedCourseName,
  });
}
