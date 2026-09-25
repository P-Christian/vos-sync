import "server-only";

import { fetchRows } from "./directus";
import { primitiveError } from "./errors";
import {
  courseRequestSchema,
  type CourseRequestRecord,
} from "./schemas";

export const COURSE_REQUEST_FIELDS =
  "course_request_id,employee_education_id,school_id,requested_by,requested_course_name,request_status,matched_school_course_id,reviewed_by,reviewed_at,routed_by,routed_at,admin_remarks";

export async function fetchCourseRequestRows(
  field: "course_request_id" | "employee_education_id",
  value: number
): Promise<readonly CourseRequestRecord[]> {
  const query = new URLSearchParams({
    [`filter[${field}][_eq]`]: String(value),
    fields: COURSE_REQUEST_FIELDS,
    limit: "2",
  });
  return fetchRows(
    "courseRequest.fetchExact",
    `/items/vs_course_request?${query.toString()}`,
    courseRequestSchema
  );
}

export async function fetchCourseRequestExact(
  requestId: number
): Promise<CourseRequestRecord> {
  const rows = await fetchCourseRequestRows("course_request_id", requestId);
  if (rows.length === 0) {
    throw primitiveError("NOT_FOUND", "Course request was not found.");
  }
  if (rows.length > 1) {
    throw primitiveError("AMBIGUOUS", "Course request is ambiguous.");
  }
  const request = rows[0];
  if (!request) {
    throw primitiveError("DEPENDENCY_FAILURE", "Course request could not be read.");
  }
  return request;
}
