import type { EmployeeEducationRecord, SchoolStudentRecord } from "./types";

export function normalizeSchoolName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function toEducationUserId(userId: string | number): number | null {
  const parsed = typeof userId === "number" ? userId : Number(userId);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function selectEducationTarget(
  rows: readonly EmployeeEducationRecord[],
  schoolId: number,
  schoolName: string | null | undefined
): EmployeeEducationRecord | null {
  const schoolIdTarget = rows.find((row) => row.school_id === schoolId);
  if (schoolIdTarget) return schoolIdTarget;

  const normalizedSchoolName = normalizeSchoolName(schoolName);
  if (!normalizedSchoolName) return null;
  return (
    rows.find(
      (row) =>
        row.education_status === "Pending" &&
        normalizeSchoolName(row.school_name_raw) === normalizedSchoolName
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
