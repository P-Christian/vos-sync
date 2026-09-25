import "server-only";

import { z } from "zod";

import type { PersistedPendingEducation } from "./education-persistence.repo";

const REQUEST_FIELDS = [
  "school_request_id",
  "requested_by",
  "requested_school_name",
  "request_status",
  "matched_school_id",
  "routed_by",
  "routed_at",
  "employee_education_id",
  "active_employee_education_id",
  "created_at",
].join(",");

const schoolSchema = z.object({
  school_id: z.coerce.number().int().positive(),
  school_name: z.string().trim().min(1),
  verification_status: z.literal("VERIFIED"),
  school_status: z.literal("Active"),
});

const requestSchema = z.object({
  school_request_id: z.coerce.number().int().positive(),
  requested_by: z.coerce.number().int().positive(),
  requested_school_name: z.string().trim().min(1),
  request_status: z.enum(["Pending", "Approved", "Rejected", "RoutedToSchool"]),
  matched_school_id: z.coerce.number().int().positive().nullable().optional(),
  routed_by: z.coerce.number().int().positive().nullable().optional(),
  routed_at: z.string().nullable().optional(),
  employee_education_id: z.coerce.number().int().positive(),
  active_employee_education_id: z.coerce.number().int().positive().nullable(),
  created_at: z.string().optional(),
});

export type PersistedAttendanceRequest = z.infer<typeof requestSchema>;

export class AttendanceRequestError extends Error {
  public readonly name = "AttendanceRequestError";
}

function config(): { readonly baseUrl: string; readonly headers: Record<string, string> } {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!baseUrl || !token) {
    throw new AttendanceRequestError("Attendance request storage is not configured.");
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

function phTimestamp(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

async function fetchCanonicalSchool(schoolId: number): Promise<z.infer<typeof schoolSchema>> {
  const { baseUrl, headers } = config();
  const query = new URLSearchParams({
    fields: "school_id,school_name,verification_status,school_status",
  });
  const response = await fetch(`${baseUrl}/items/vs_school/${schoolId}?${query.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) throw new AttendanceRequestError("The selected school is unavailable.");
  const parsed = z.object({ data: schoolSchema }).safeParse(await response.json());
  if (!parsed.success || parsed.data.data.school_id !== schoolId) {
    throw new AttendanceRequestError("The selected school is not Verified and Active.");
  }
  return parsed.data.data;
}

async function fetchActiveRequest(
  educationId: number
): Promise<PersistedAttendanceRequest | null> {
  const { baseUrl, headers } = config();
  const query = new URLSearchParams({ fields: REQUEST_FIELDS, limit: "2", sort: "-created_at" });
  query.set("filter[employee_education_id][_eq]", String(educationId));
  query.set("filter[request_status][_neq]", "Rejected");
  const response = await fetch(`${baseUrl}/items/vs_school_request?${query.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new AttendanceRequestError("Attendance request storage is temporarily unavailable.");
  }
  const parsed = z.object({ data: z.array(requestSchema).max(1) }).safeParse(await response.json());
  if (!parsed.success) {
    throw new AttendanceRequestError("Attendance request state is ambiguous.");
  }
  return parsed.data.data[0] ?? null;
}

function requireLinkedRequest(
  request: PersistedAttendanceRequest,
  education: PersistedPendingEducation
): PersistedAttendanceRequest {
  if (
    request.requested_by !== education.user_id ||
    request.employee_education_id !== education.employee_education_id ||
    request.active_employee_education_id !== education.employee_education_id
  ) {
    throw new AttendanceRequestError("Attendance request linkage is invalid.");
  }
  // Defect (1): a reused request must still match the persisted education's
  // canonical state. Any drift fails closed — never returned as valid.
  // Defect (2): enforce canonical route semantics; reject hybrids.
  // System auto-route is the only writer on this path, so routed_by must
  // always be the null system-route marker (never a VOS Admin action).
  if (request.routed_by !== null && request.routed_by !== undefined) {
    throw new AttendanceRequestError("Attendance request route actor is invalid.");
  }
  if (education.school_id !== null) {
    if (request.request_status !== "RoutedToSchool") {
      throw new AttendanceRequestError("Attendance request route state is invalid.");
    }
    if (request.matched_school_id !== education.school_id) {
      throw new AttendanceRequestError("Attendance request school linkage is invalid.");
    }
    if (typeof request.routed_at !== "string" || request.routed_at.length === 0) {
      throw new AttendanceRequestError("Attendance request route time is invalid.");
    }
  } else {
    if (request.request_status !== "Pending") {
      throw new AttendanceRequestError("Attendance request route state is invalid.");
    }
    if (request.matched_school_id !== null && request.matched_school_id !== undefined) {
      throw new AttendanceRequestError("Attendance request school linkage is invalid.");
    }
    if (request.routed_at !== null && request.routed_at !== undefined) {
      throw new AttendanceRequestError("Attendance request route time is invalid.");
    }
    const expectedRaw = (education.school_name_raw ?? "").trim();
    if (!expectedRaw || request.requested_school_name.trim() !== expectedRaw) {
      throw new AttendanceRequestError("Attendance request school identity is invalid.");
    }
  }
  return request;
}

export async function ensureEducationAttendanceRequest(
  education: PersistedPendingEducation
): Promise<PersistedAttendanceRequest> {
  const existing = await fetchActiveRequest(education.employee_education_id);
  if (existing) return requireLinkedRequest(existing, education);

  const school = education.school_id === null
    ? null
    : await fetchCanonicalSchool(education.school_id);
  const requestedSchoolName = school?.school_name ?? education.school_name_raw?.trim();
  if (!requestedSchoolName) {
    throw new AttendanceRequestError("A school name is required.");
  }

  const payload = {
    requested_by: education.user_id,
    requested_school_name: requestedSchoolName,
    request_status: school ? "RoutedToSchool" : "Pending",
    matched_school_id: school?.school_id ?? null,
    routed_by: null,
    routed_at: school ? phTimestamp() : null,
    employee_education_id: education.employee_education_id,
    active_employee_education_id: education.employee_education_id,
  };
  const { baseUrl, headers } = config();
  try {
    const response = await fetch(
      `${baseUrl}/items/vs_school_request?fields=${encodeURIComponent(REQUEST_FIELDS)}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );
    if (response.ok) {
      const parsed = z.object({ data: requestSchema }).safeParse(await response.json());
      if (parsed.success) return requireLinkedRequest(parsed.data.data, education);
    }
  } catch (error: unknown) {
    if (error instanceof AttendanceRequestError) throw error;
  }

  const recovered = await fetchActiveRequest(education.employee_education_id);
  if (recovered) return requireLinkedRequest(recovered, education);
  throw new AttendanceRequestError("Attendance request could not be saved.");
}
