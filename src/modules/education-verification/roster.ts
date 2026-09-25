import "server-only";

import {
  createRow,
  fetchRows,
  isDependencyFailure,
  patchRows,
} from "./directus";
import { primitiveError } from "./errors";
import {
  fetchAuthoritativeUser,
  fetchEducationExact,
  fetchRosterExact,
  fetchRosterRows,
  ROSTER_FIELDS,
} from "./records";
import {
  attendanceEvidenceSchema,
  rosterSchema,
  type ApprovedAttendanceEvidence,
  type AttendanceRosterRecord,
  type AuthoritativeUser,
} from "./schemas";
import type {
  AttendanceEvidenceInput,
  CompleteAttendanceRosterCourseInput,
  EnsureAttendanceRosterInput,
  RosterClassification,
} from "./types";
import { requirePositiveInteger } from "./validation";

const CALENDAR_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)$/u;

function parseCalendarDate(value: string, field: string): string {
  const match = CALENDAR_DATE.exec(value);
  if (!match) {
    throw primitiveError("INVALID_INPUT", `${field} must contain a valid date.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw primitiveError("INVALID_INPUT", `${field} must contain a valid date.`);
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Compare calendar dates, not instants. The leading valid YYYY-MM-DD portions
 * are compared lexicographically; therefore an equal end and approval date is
 * alumni, regardless of either date-time's clock component or offset.
 */
export function deriveRosterClassification(
  endDate: string | null,
  approvalDate: string
): RosterClassification {
  const approvedOn = parseCalendarDate(approvalDate, "approvalDate");
  if (endDate === null) return "current";
  const endedOn = parseCalendarDate(endDate, "endDate");
  return endedOn <= approvedOn ? "alumni" : "current";
}

function normalizedIdentity(user: AuthoritativeUser) {
  const email = user.user_email?.trim() ?? "";
  if (email.length === 0) {
    throw primitiveError(
      "INVALID_IDENTITY",
      "The authoritative user record has no usable email."
    );
  }
  return {
    firstName: user.user_fname,
    middleName: user.user_mname?.trim() || "",
    lastName: user.user_lname,
    email,
  };
}

function assertReusableRoster(
  row: AttendanceRosterRecord,
  educationUserId: number,
  schoolId: number,
  courseId: number | null
): void {
  if (row.school_id !== schoolId || row.registered_user_id !== educationUserId) {
    throw primitiveError(
      "CORRELATION_CONFLICT",
      "The education-linked roster row belongs to a different school or user."
    );
  }
  if (
    courseId !== null &&
    row.school_course_id !== null &&
    row.school_course_id !== courseId
  ) {
    throw primitiveError(
      "STALE_CONFLICT",
      "The roster row already carries a different course."
    );
  }
}

export async function ensureAttendanceRoster(
  input: EnsureAttendanceRosterInput
): Promise<AttendanceRosterRecord> {
  const educationId = requirePositiveInteger(input.educationId, "educationId");
  const schoolId = requirePositiveInteger(input.schoolId, "schoolId");
  if (input.courseId !== null) requirePositiveInteger(input.courseId, "courseId");
  const education = await fetchEducationExact(educationId);
  const existing = await fetchRosterRows(educationId);
  if (existing.length > 1) {
    throw primitiveError("AMBIGUOUS", "Education-linked roster rows are ambiguous.");
  }
  const current = existing[0];
  if (current) {
    assertReusableRoster(current, education.user_id, schoolId, input.courseId);
    return current;
  }

  const firstUserRead = await fetchAuthoritativeUser(education.user_id);
  const firstIdentity = normalizedIdentity(firstUserRead);
  const secondIdentity = normalizedIdentity(
    await fetchAuthoritativeUser(education.user_id)
  );
  if (JSON.stringify(firstIdentity) !== JSON.stringify(secondIdentity)) {
    throw primitiveError(
      "CONCURRENT_CHANGE",
      "The authoritative user identity changed during roster creation."
    );
  }
  const classification = deriveRosterClassification(
    education.end_date,
    input.approvalDate
  );
  try {
    return await createRow(
      "roster.createForAttendance",
      "vs_school_student",
      {
        school_id: schoolId,
        student_number: input.studentNumber?.trim() || null,
        first_name: secondIdentity.firstName,
        middle_name: secondIdentity.middleName,
        last_name: secondIdentity.lastName,
        email: secondIdentity.email,
        school_course_id: input.courseId,
        school_year: input.schoolYear?.trim() || null,
        gpa: input.gpa ?? null,
        is_alumni: classification === "alumni",
        employee_education_id: educationId,
        registered_user_id: education.user_id,
        invitation_status: "Registered",
      },
      ROSTER_FIELDS,
      rosterSchema
    );
  } catch (error: unknown) {
    if (!isDependencyFailure(error)) throw error;
    const winner = await fetchRosterExact(educationId);
    assertReusableRoster(winner, education.user_id, schoolId, input.courseId);
    return winner;
  }
}

export async function fetchApprovedAttendanceEvidence(
  input: AttendanceEvidenceInput
): Promise<ApprovedAttendanceEvidence> {
  const educationId = requirePositiveInteger(input.educationId, "educationId");
  const schoolId = requirePositiveInteger(input.schoolId, "schoolId");
  const query = new URLSearchParams({
    "filter[employee_education_id][_eq]": String(educationId),
    "filter[matched_school_id][_eq]": String(schoolId),
    "filter[request_status][_eq]": "Approved",
    fields:
      "school_request_id,employee_education_id,matched_school_id,request_status",
    limit: "2",
  });
  const rows = await fetchRows(
    "attendance.fetchApprovedEvidence",
    `/items/vs_school_request?${query.toString()}`,
    attendanceEvidenceSchema
  );
  if (rows.length === 0) {
    throw primitiveError(
      "EVIDENCE_ABSENT",
      "Approved attendance evidence was not found for this education and school."
    );
  }
  if (rows.length > 1) {
    throw primitiveError("AMBIGUOUS", "Approved attendance evidence is ambiguous.");
  }
  const evidence = rows[0];
  if (!evidence) throw primitiveError("DEPENDENCY_FAILURE", "Attendance evidence could not be read.");
  return evidence;
}

export async function completeAttendanceRosterCourse(
  input: CompleteAttendanceRosterCourseInput
): Promise<AttendanceRosterRecord> {
  const educationId = requirePositiveInteger(input.educationId, "educationId");
  const schoolId = requirePositiveInteger(input.schoolId, "schoolId");
  const courseId = requirePositiveInteger(input.courseId, "courseId");
  const current = await fetchRosterExact(educationId);
  if (current.school_id !== schoolId) {
    throw primitiveError("CORRELATION_CONFLICT", "The roster row belongs to another school.");
  }
  if (current.school_course_id === courseId) return current;
  if (current.school_course_id !== null) {
    throw primitiveError("STALE_CONFLICT", "The roster row already carries another course.");
  }
  const updated = await patchRows(
    {
      operation: "roster.completeCourse",
      collection: "vs_school_student",
      filter: {
        student_id: { _eq: current.student_id },
        employee_education_id: { _eq: educationId },
        school_id: { _eq: schoolId },
        school_course_id: { _null: true },
      },
      data: { school_course_id: courseId },
      fields: ROSTER_FIELDS,
    },
    rosterSchema
  );
  if (updated) return updated;
  const readBack = await fetchRosterExact(educationId);
  if (readBack.school_id === schoolId && readBack.school_course_id === courseId) {
    return readBack;
  }
  throw primitiveError("STALE_CONFLICT", "The roster row changed before course completion.");
}
