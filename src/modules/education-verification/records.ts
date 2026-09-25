import "server-only";

import { fetchRows } from "./directus";
import { primitiveError } from "./errors";
import {
  educationSchema,
  rosterSchema,
  userSchema,
  type AttendanceRosterRecord,
  type AuthoritativeUser,
  type EducationRecord,
} from "./schemas";

export const EDUCATION_FIELDS =
  "employee_education_id,user_id,school_id,school_course_id,school_name_raw,course_name_raw,education_status,end_date";
export const ROSTER_FIELDS =
  "student_id,school_id,student_number,first_name,middle_name,last_name,email,school_course_id,school_year,gpa,is_alumni,employee_education_id,invitation_status,registered_user_id";
export const USER_FIELDS =
  "user_id,user_fname,user_mname,user_lname,user_email";

function exact<T>(
  rows: readonly T[],
  absentCode: "NOT_FOUND" | "ROSTER_ABSENT",
  subject: string
): T {
  if (rows.length === 0) {
    throw primitiveError(absentCode, `${subject} was not found.`);
  }
  if (rows.length > 1) {
    throw primitiveError("AMBIGUOUS", `${subject} is ambiguous.`);
  }
  const row = rows[0];
  if (row === undefined) {
    throw primitiveError("DEPENDENCY_FAILURE", `${subject} could not be read.`);
  }
  return row;
}

export async function fetchEducationExact(
  educationId: number
): Promise<EducationRecord> {
  const query = new URLSearchParams({
    "filter[employee_education_id][_eq]": String(educationId),
    fields: EDUCATION_FIELDS,
    limit: "2",
  });
  const rows = await fetchRows(
    "education.fetchExact",
    `/items/vs_employee_education?${query.toString()}`,
    educationSchema
  );
  return exact(rows, "NOT_FOUND", "Linked education");
}

export async function fetchAuthoritativeUser(
  userId: number
): Promise<AuthoritativeUser> {
  const query = new URLSearchParams({
    "filter[user_id][_eq]": String(userId),
    fields: USER_FIELDS,
    limit: "2",
  });
  const rows = await fetchRows(
    "user.fetchAuthoritative",
    `/items/vs_user?${query.toString()}`,
    userSchema
  );
  return exact(rows, "NOT_FOUND", "Authoritative user");
}

export async function fetchRosterRows(
  educationId: number
): Promise<readonly AttendanceRosterRecord[]> {
  const query = new URLSearchParams({
    "filter[employee_education_id][_eq]": String(educationId),
    fields: ROSTER_FIELDS,
    limit: "2",
  });
  return fetchRows(
    "roster.fetchByEducation",
    `/items/vs_school_student?${query.toString()}`,
    rosterSchema
  );
}

export async function fetchRosterExact(
  educationId: number
): Promise<AttendanceRosterRecord> {
  const rows = await fetchRosterRows(educationId);
  return exact(rows, "ROSTER_ABSENT", "Education-linked roster row");
}
