import "server-only";

import { z } from "zod";

import { fetchRows, request, responseJson } from "./directus";
import { routingError } from "./errors";
import {
  educationSchema,
  schoolAdminSchema,
  schoolRequestSchema,
  schoolSchema,
} from "./schemas";
import type {
  EducationRecord,
  SchoolAdminRecord,
  SchoolRecord,
  SchoolRequestRecord,
  SchoolRouteClassification,
} from "./types";

export const SCHOOL_REQUEST_FIELDS =
  "school_request_id,requested_by,requested_school_name,city_municipality,province,request_status,matched_school_id,admin_remarks,reviewed_by,reviewed_at,routed_by,routed_at,employee_education_id,active_employee_education_id,created_at";
export const EDUCATION_FIELDS =
  "employee_education_id,user_id,school_id,school_name_raw,education_status";
export const SCHOOL_FIELDS = "school_id,school_name,school_status,verification_status,is_active";
export const SCHOOL_ADMIN_FIELDS = "school_admin_id,school_id,user_id,is_active";
export const EDUCATION_BIND_FIELDS = "employee_education_id,school_id";

function exact<T>(rows: readonly T[], subject: string): T {
  if (rows.length === 0) throw routingError("NOT_FOUND", `${subject} was not found.`, 404);
  if (rows.length > 1) throw routingError("AMBIGUOUS", `${subject} is ambiguous.`);
  const row = rows[0];
  if (row === undefined) throw routingError("DEPENDENCY_FAILURE", `${subject} could not be read.`, 502);
  return row;
}

export async function fetchSchoolRequest(requestId: number): Promise<SchoolRequestRecord> {
  const query = new URLSearchParams({
    "filter[school_request_id][_eq]": String(requestId),
    fields: SCHOOL_REQUEST_FIELDS,
    limit: "2",
  });
  return exact(
    await fetchRows("schoolRequest.fetchById", `/items/vs_school_request?${query.toString()}`, schoolRequestSchema),
    "School request"
  );
}

export async function listWaitingSchoolRequests(schoolId: number): Promise<readonly SchoolRequestRecord[]> {
  const query = new URLSearchParams({
    "filter[request_status][_eq]": "Pending",
    "filter[matched_school_id][_eq]": String(schoolId),
    fields: SCHOOL_REQUEST_FIELDS,
    limit: "-1",
  });
  return fetchRows("schoolRequest.listWaiting", `/items/vs_school_request?${query.toString()}`, schoolRequestSchema);
}

export async function fetchEducation(educationId: number): Promise<EducationRecord> {
  const query = new URLSearchParams({
    "filter[employee_education_id][_eq]": String(educationId),
    fields: EDUCATION_FIELDS,
    limit: "2",
  });
  return exact(
    await fetchRows("education.fetchById", `/items/vs_employee_education?${query.toString()}`, educationSchema),
    "Linked education"
  );
}

export async function fetchSchool(schoolId: number): Promise<SchoolRecord> {
  const query = new URLSearchParams({
    "filter[school_id][_eq]": String(schoolId),
    fields: SCHOOL_FIELDS,
    limit: "2",
  });
  return exact(
    await fetchRows("school.fetchById", `/items/vs_school?${query.toString()}`, schoolSchema),
    "Target school"
  );
}

export async function fetchActiveSchoolAdmins(schoolId: number): Promise<readonly SchoolAdminRecord[]> {
  const query = new URLSearchParams({
    "filter[school_id][_eq]": String(schoolId),
    "filter[is_active][_eq]": "1",
    fields: SCHOOL_ADMIN_FIELDS,
    limit: "-1",
  });
  return fetchRows("schoolAdmin.listActive", `/items/vs_school_admin?${query.toString()}`, schoolAdminSchema);
}

function activeSchoolFlag(value: boolean | number): boolean {
  return value === true || value === 1;
}

export async function fetchSchoolRoute(schoolId: number): Promise<
  Readonly<{
    school: SchoolRecord;
    classification: SchoolRouteClassification | null;
  }>
> {
  const [school, admins] = await Promise.all([fetchSchool(schoolId), fetchActiveSchoolAdmins(schoolId)]);
  const hasActiveAdmin = admins.length > 0;
  if (
    school.verification_status === "VERIFIED" &&
    school.school_status === "Active" &&
    activeSchoolFlag(school.is_active) &&
    hasActiveAdmin
  ) {
    return { school, classification: "DIRECT_REVIEW" };
  }
  if (!activeSchoolFlag(school.is_active)) return { school, classification: null };
  if (["REJECTED", "SUSPENDED", "INACTIVE"].includes(school.verification_status)) {
    return { school, classification: null };
  }
  if (["Inactive", "Suspended"].includes(school.school_status)) {
    return { school, classification: null };
  }
  if (hasActiveAdmin) return { school, classification: "AWAITING_ACTIVATION" };
  if (school.verification_status === "DRAFT" && school.school_status === "Draft") {
    return { school, classification: "AWAITING_REGISTRATION" };
  }
  return { school, classification: null };
}

export async function classifySchoolRoute(schoolId: number): Promise<SchoolRouteClassification | null> {
  return (await fetchSchoolRoute(schoolId)).classification;
}

const educationBindRowSchema = z.object({
  employee_education_id: z.number().int(),
  school_id: z.number().int().nullable(),
});

function isBindableId(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export async function bindEducationSchool(educationId: number, schoolId: number): Promise<boolean> {
  try {
    if (!isBindableId(educationId) || !isBindableId(schoolId)) return false;
    const preflight = new URLSearchParams({
      "filter[employee_education_id][_eq]": String(educationId),
      "filter[school_id][_null]": "true",
      fields: EDUCATION_BIND_FIELDS,
      limit: "2",
    });
    const rows = await fetchRows(
      "education.bindPreflight",
      `/items/vs_employee_education?${preflight.toString()}`,
      educationBindRowSchema
    );
    if (rows.length !== 1) return false;
    const response = await request("education.bindSchool", "/items/vs_employee_education", {
      method: "PATCH",
      body: JSON.stringify({
        data: { school_id: schoolId },
        query: {
          filter: {
            employee_education_id: { _eq: educationId },
            school_id: { _null: true },
          },
        },
      }),
    });
    const body: unknown = await responseJson("education.bindSchool", response);
    const parsed = z.object({ data: z.array(educationBindRowSchema).max(1) }).safeParse(body);
    if (!parsed.success) return false;
    return parsed.data.data.length > 0;
  } catch {
    return false;
  }
}
