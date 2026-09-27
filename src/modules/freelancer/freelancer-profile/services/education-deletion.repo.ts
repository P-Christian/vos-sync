import "server-only";

import { z } from "zod";

const educationSchema = z.object({
  employee_education_id: z.coerce.number().int().positive(),
});

const requestSchema = z.object({
  school_request_id: z.coerce.number().int().positive(),
  requested_by: z.coerce.number().int().positive(),
  request_status: z.enum(["Pending", "Approved", "Rejected", "RoutedToSchool"]),
  employee_education_id: z.coerce.number().int().positive(),
  active_employee_education_id: z.coerce.number().int().positive().nullable(),
});

const courseRequestSchema = z.object({
  course_request_id: z.coerce.number().int().positive(),
  requested_by: z
    .union([
      z.coerce.number().int().positive(),
      z.object({ user_id: z.coerce.number().int().positive() }),
    ])
    .transform((value) => (typeof value === "number" ? value : value.user_id)),
  request_status: z.enum(["Pending", "Approved", "Rejected", "RoutedToSchool"]),
  employee_education_id: z.coerce.number().int().positive(),
});

export type EducationDeletionErrorCode =
  | "NOT_FOUND"
  | "LINKAGE_INVALID"
  | "STATE_CONFLICT"
  | "DEPENDENCY_FAILURE";

export class EducationDeletionError extends Error {
  public readonly name = "EducationDeletionError";
  public readonly code: EducationDeletionErrorCode;

  constructor(message: string, code: EducationDeletionErrorCode = "DEPENDENCY_FAILURE") {
    super(message);
    this.code = code;
  }
}

function config(): { readonly baseUrl: string; readonly headers: Record<string, string> } {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!baseUrl || !token) {
    throw new EducationDeletionError(
      "Education storage is not configured.",
      "DEPENDENCY_FAILURE"
    );
  }
  return {
    baseUrl,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

async function deleteItem(
  collection: "vs_school_request" | "vs_course_request" | "vs_employee_education",
  id: number,
  message: string
): Promise<void> {
  const { baseUrl, headers } = config();
  const response = await fetch(`${baseUrl}/items/${collection}/${id}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });
  if (!response.ok) throw new EducationDeletionError(message, "DEPENDENCY_FAILURE");
}

function isRemovableLinkStatus(status: string): boolean {
  return status === "Pending" || status === "Rejected";
}

async function hasOwnedPendingEducation(
  educationId: number,
  userId: number
): Promise<boolean> {
  const { baseUrl, headers } = config();
  const educationQuery = new URLSearchParams({ fields: "employee_education_id", limit: "2" });
  educationQuery.set("filter[employee_education_id][_eq]", String(educationId));
  educationQuery.set("filter[user_id][_eq]", String(userId));
  educationQuery.set("filter[education_status][_eq]", "Pending");
  const educationResponse = await fetch(
    `${baseUrl}/items/vs_employee_education?${educationQuery.toString()}`,
    { headers, cache: "no-store" }
  );
  const education = educationResponse.ok
    ? z.object({ data: z.array(educationSchema).max(1) }).safeParse(await educationResponse.json())
    : null;
  return education?.success === true && education.data.data.length === 1;
}

export async function deletePendingEducationAndRequests(
  educationId: number,
  userId: number
): Promise<void> {
  const { baseUrl, headers } = config();
  if (!(await hasOwnedPendingEducation(educationId, userId))) {
    throw new EducationDeletionError("Education was not found.", "NOT_FOUND");
  }

  // Both the historical link and the live link name this education, so either
  // side scopes the blast radius. A sibling education's rows never match.
  const requestQuery = new URLSearchParams({
    fields:
      "school_request_id,requested_by,request_status,employee_education_id,active_employee_education_id",
    limit: "-1",
  });
  requestQuery.set("filter[_or][0][employee_education_id][_eq]", String(educationId));
  requestQuery.set("filter[_or][1][active_employee_education_id][_eq]", String(educationId));
  const requestResponse = await fetch(
    `${baseUrl}/items/vs_school_request?${requestQuery.toString()}`,
    { headers, cache: "no-store" }
  );
  const requests = requestResponse.ok
    ? z.object({ data: z.array(requestSchema) }).safeParse(await requestResponse.json())
    : null;
  if (!requests?.success) {
    throw new EducationDeletionError(
      "Attendance request linkage is invalid.",
      "DEPENDENCY_FAILURE"
    );
  }
  if (requests.data.data.some((request) => request.requested_by !== userId)) {
    throw new EducationDeletionError(
      "Attendance request linkage is invalid.",
      "LINKAGE_INVALID"
    );
  }
  // Only quiescent links travel with the education. A link that has advanced
  // to Approved or RoutedToSchool refuses the whole deletion, so an in-flight
  // review is never silently dropped. Pending and Rejected links are removed
  // with the education.
  const advanced = requests.data.data.filter(
    (request) => !isRemovableLinkStatus(request.request_status)
  );
  if (advanced.length > 0) {
    throw new EducationDeletionError(
      "The education cannot be deleted while a linked request is already in progress.",
      "STATE_CONFLICT"
    );
  }

  // Course links carry the same delete guard on the same education id, so
  // they are enumerated and classified BEFORE anything is deleted. A course
  // row that has advanced to Approved or RoutedToSchool refuses the whole
  // deletion, and deleting the school links first would leave a partial
  // state the education delete can no longer complete. Pending and Rejected
  // course links are removed with the education; a fresh course request can
  // be filed afterwards because the unique slot is free again.
  const courseQuery = new URLSearchParams({
    fields: "course_request_id,requested_by,request_status,employee_education_id",
    limit: "-1",
  });
  courseQuery.set("filter[employee_education_id][_eq]", String(educationId));
  const courseResponse = await fetch(
    `${baseUrl}/items/vs_course_request?${courseQuery.toString()}`,
    { headers, cache: "no-store" }
  );
  const courseRequests = courseResponse.ok
    ? z.object({ data: z.array(courseRequestSchema) }).safeParse(await courseResponse.json())
    : null;
  if (!courseRequests?.success) {
    throw new EducationDeletionError(
      "Attendance request linkage is invalid.",
      "DEPENDENCY_FAILURE"
    );
  }
  if (courseRequests.data.data.some((request) => request.requested_by !== userId)) {
    throw new EducationDeletionError(
      "Attendance request linkage is invalid.",
      "LINKAGE_INVALID"
    );
  }
  const settledCourse = courseRequests.data.data.filter(
    (request) => !isRemovableLinkStatus(request.request_status)
  );
  if (settledCourse.length > 0) {
    throw new EducationDeletionError(
      "The education cannot be deleted while a linked course request has already been decided or routed.",
      "STATE_CONFLICT"
    );
  }

  for (const request of requests.data.data) {
    await deleteItem(
      "vs_school_request",
      request.school_request_id,
      "Attendance request could not be deleted."
    );
  }
  for (const request of courseRequests.data.data) {
    await deleteItem(
      "vs_course_request",
      request.course_request_id,
      "Course request could not be deleted."
    );
  }
  // Re-check ownership and Pending status immediately before the final
  // delete, so an education that a concurrent verification just advanced can
  // no longer be removed in the window between the entry guard and this row.
  if (!(await hasOwnedPendingEducation(educationId, userId))) {
    throw new EducationDeletionError(
      "The education changed before deletion.",
      "STATE_CONFLICT"
    );
  }
  await deleteItem("vs_employee_education", educationId, "Education could not be deleted.");
}
