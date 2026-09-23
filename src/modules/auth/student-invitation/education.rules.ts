import type { EmployeeEducationRecord, SchoolStudentRecord } from "./types";

export function normalizeSchoolName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function toEducationUserId(userId: string | number): number | null {
  const parsed = typeof userId === "number" ? userId : Number(userId);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Selects the education row to update, preferring an exact school-and-course
 * match, then an unassigned-course school match, when the roster has a course.
 * Without a roster course, it uses the first school match regardless of course.
 * Both paths fall back to a Pending raw school-name match.
 */
export function selectEducationTarget(
  rows: readonly EmployeeEducationRecord[],
  schoolId: number,
  schoolName: string | null | undefined,
  schoolCourseId: number | null
): EmployeeEducationRecord | null {
  if (schoolCourseId !== null) {
    const schoolCourseTarget = rows.find(
      (row) =>
        row.school_id === schoolId && row.school_course_id === schoolCourseId
    );
    if (schoolCourseTarget) return schoolCourseTarget;

    const schoolTarget = rows.find(
      (row) => row.school_id === schoolId && row.school_course_id === null
    );
    if (schoolTarget) return schoolTarget;
  } else {
    const schoolTarget = rows.find((row) => row.school_id === schoolId);
    if (schoolTarget) return schoolTarget;
  }

  const normalized = normalizeSchoolName(schoolName);
  if (!normalized) return null;
  return (
    rows.find(
      (row) =>
        row.education_status === "Pending" &&
        normalizeSchoolName(row.school_name_raw) === normalized
    ) ?? null
  );
}

export function buildEducationData(
  student: SchoolStudentRecord
): Record<string, unknown> {
  if (student.school_course_id === null) {
    return {
      school_id: student.school_id,
      education_status: "Verified",
    };
  }
  return {
    school_id: student.school_id,
    school_course_id: student.school_course_id,
    education_status: "Verified",
  };
}
