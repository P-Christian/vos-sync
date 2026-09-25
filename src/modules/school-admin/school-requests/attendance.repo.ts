import "server-only";

import { z } from "zod";

import { dependencyError, SchoolRequestSchoolAdminError } from "./errors";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/u, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const requestSchema = z.object({
  school_request_id: z.number().int(),
  requested_by: z.number().int(),
  requested_school_name: z.string(),
  request_status: z.enum(["Pending", "Approved", "Rejected", "RoutedToSchool"]),
  matched_school_id: z.number().int().nullable(),
  admin_remarks: z.string().nullable(),
  reviewed_by: z.number().int().nullable(),
  reviewed_at: z.string().nullable(),
  routed_by: z.number().int().nullable(),
  routed_at: z.string().nullable(),
  employee_education_id: z.number().int().nullable(),
  active_employee_education_id: z.number().int().nullable(),
  created_at: z.string(),
});

const educationSchema = z.object({
  employee_education_id: z.number().int(),
  course_name_raw: z.string().nullable(),
  end_date: z.string().nullable(),
});

export type AttendanceRequestRecord = z.infer<typeof requestSchema>;
export type AttendanceEducationRecord = z.infer<typeof educationSchema>;

function headers(): Record<string, string> {
  const value: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) value.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return value;
}

async function read<T>(operation: string, path: string, schema: z.ZodType<T>): Promise<T> {
  if (!DIRECTUS_BASE) throw dependencyError(`${operation}.configuration`);
  try {
    const response = await fetch(`${DIRECTUS_BASE}${path}`, { headers: headers(), cache: "no-store" });
    if (!response.ok) throw dependencyError(operation, response.status);
    const parsed = z.object({ data: schema }).safeParse(await response.json());
    if (!parsed.success) throw dependencyError(`${operation}.response`);
    return parsed.data.data;
  } catch (error: unknown) {
    if (error instanceof SchoolRequestSchoolAdminError) throw error;
    throw dependencyError(operation, undefined, error);
  }
}

export async function fetchAttendanceRequest(requestId: number): Promise<AttendanceRequestRecord> {
  return read(
    "schoolRequest.attendance.fetch",
    `/items/vs_school_request/${requestId}?fields=school_request_id,requested_by,requested_school_name,request_status,matched_school_id,admin_remarks,reviewed_by,reviewed_at,routed_by,routed_at,employee_education_id,active_employee_education_id,created_at`,
    requestSchema,
  );
}

export async function fetchAttendanceEducation(educationId: number): Promise<AttendanceEducationRecord> {
  const query = new URLSearchParams({
    "filter[employee_education_id][_eq]": String(educationId),
    fields: "employee_education_id,course_name_raw,end_date",
    limit: "2",
  });
  const rows = await read(
    "schoolRequest.attendance.education",
    `/items/vs_employee_education?${query.toString()}`,
    z.array(educationSchema),
  );
  if (rows.length !== 1 || !rows[0]) throw dependencyError("schoolRequest.attendance.education.cardinality");
  return rows[0];
}

export async function patchAttendanceRequest(
  operation: string,
  filter: Readonly<Record<string, unknown>>,
  data: Readonly<Record<string, unknown>>,
): Promise<AttendanceRequestRecord | null> {
  if (!DIRECTUS_BASE) throw dependencyError(`${operation}.configuration`);
  try {
    // Directus rejects `fields` inside the JSON body ("Invalid payload"); it
    // must be a query parameter, matching the proven neutral/roster convention.
    const query = new URLSearchParams({
      fields: "school_request_id,requested_by,requested_school_name,request_status,matched_school_id,admin_remarks,reviewed_by,reviewed_at,routed_by,routed_at,employee_education_id,active_employee_education_id,created_at",
    });
    const response = await fetch(`${DIRECTUS_BASE}/items/vs_school_request?${query.toString()}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ query: { filter }, data }),
    });
    if (!response.ok) throw dependencyError(operation, response.status);
    const body: unknown = await response.json();
    const parsed = z.object({ data: z.union([requestSchema, z.array(requestSchema)]).nullable() }).safeParse(body);
    if (!parsed.success || parsed.data.data === null) return null;
    return Array.isArray(parsed.data.data) ? parsed.data.data[0] ?? null : parsed.data.data;
  } catch (error: unknown) {
    if (error instanceof SchoolRequestSchoolAdminError) throw error;
    throw dependencyError(operation, undefined, error);
  }
}
