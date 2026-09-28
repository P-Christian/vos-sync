import "server-only";

import { patchRows } from "./directus";
import { primitiveError } from "./errors";
import { EDUCATION_FIELDS, fetchEducationExact } from "./records";
import { educationSchema, type EducationRecord } from "./schemas";
import type {
  CourseCompletionReconciliation,
  ReconcileLinkedEducationInput,
  SchoolAttendanceReconciliation,
} from "./types";
import {
  assertNever,
  normalizeSchoolIdentity,
  requirePositiveInteger,
} from "./validation";
import { fetchApprovedAttendanceEvidence } from "./roster";

type EducationTarget = {
  readonly schoolId: number;
  readonly courseId: number | null;
  readonly status: "Pending" | "Verified";
};

function isTargetState(
  education: EducationRecord,
  target: EducationTarget
): boolean {
  return (
    education.school_id === target.schoolId &&
    education.school_course_id === target.courseId &&
    education.education_status === target.status
  );
}

function schoolGuard(
  education: EducationRecord,
  input: SchoolAttendanceReconciliation
): Readonly<Record<string, unknown>> {
  if (education.school_id === input.canonicalSchoolId) {
    return { school_id: { _eq: input.canonicalSchoolId } };
  }
  if (education.school_id !== null) {
    throw primitiveError(
      "CORRELATION_CONFLICT",
      "The education already belongs to a different canonical school."
    );
  }
  if (
    input.expectedRawSchoolName === null ||
    education.school_name_raw === null ||
    normalizeSchoolIdentity(education.school_name_raw) !==
      normalizeSchoolIdentity(input.expectedRawSchoolName)
  ) {
    throw primitiveError(
      "CORRELATION_CONFLICT",
      "The raw school identity no longer matches the validated school."
    );
  }
  return {
    school_id: { _null: true },
    school_name_raw: { _eq: education.school_name_raw },
  };
}

async function guardedEducationPatch(
  education: EducationRecord,
  guard: Readonly<Record<string, unknown>>,
  data: Readonly<Record<string, unknown>>,
  target: EducationTarget
): Promise<EducationRecord> {
  const courseGuard =
    education.school_course_id === null
      ? { school_course_id: { _null: true } }
      : { school_course_id: { _eq: education.school_course_id } };
  const updated = await patchRows(
    {
      operation: "education.reconcile",
      collection: "vs_employee_education",
      filter: {
        employee_education_id: { _eq: education.employee_education_id },
        user_id: { _eq: education.user_id },
        education_status: { _eq: "Pending" },
        ...courseGuard,
        ...guard,
      },
      data,
      fields: EDUCATION_FIELDS,
    },
    educationSchema
  );
  if (updated) return updated;
  const current = await fetchEducationExact(education.employee_education_id);
  if (current.user_id === education.user_id && isTargetState(current, target)) {
    return current;
  }
  throw primitiveError(
    "STALE_CONFLICT",
    "The linked education changed before reconciliation."
  );
}

async function reconcileSchoolAttendance(
  input: SchoolAttendanceReconciliation,
  education: EducationRecord
): Promise<EducationRecord> {
  const guard = schoolGuard(education, input);
  if (input.canonicalCourseId === null) {
    const target: EducationTarget = {
      schoolId: input.canonicalSchoolId,
      courseId: education.school_course_id,
      status: "Verified",
    };
    if (isTargetState(education, target)) return education;
    return guardedEducationPatch(
      education,
      guard,
      {
        school_id: input.canonicalSchoolId,
        education_status: "Verified",
      },
      target
    );
  }
  const courseId = requirePositiveInteger(
    input.canonicalCourseId,
    "canonicalCourseId"
  );
  if (
    education.school_course_id !== null &&
    education.school_course_id !== courseId
  ) {
    throw primitiveError(
      "STALE_CONFLICT",
      "The linked education already carries a different course."
    );
  }
  const target: EducationTarget = {
    schoolId: input.canonicalSchoolId,
    courseId,
    status: "Verified",
  };
  if (isTargetState(education, target)) return education;
  return guardedEducationPatch(
    education,
    guard,
    {
      school_id: input.canonicalSchoolId,
      school_course_id: courseId,
      education_status: "Verified",
    },
    target
  );
}

async function reconcileCourseCompletion(
  input: CourseCompletionReconciliation,
  education: EducationRecord
): Promise<EducationRecord> {
  if (education.school_id !== input.canonicalSchoolId) {
    throw primitiveError(
      "CORRELATION_CONFLICT",
      "The linked education does not belong to the canonical school."
    );
  }
  await fetchApprovedAttendanceEvidence({
    educationId: input.educationId,
    schoolId: input.canonicalSchoolId,
  });
  if (
    education.school_course_id !== null &&
    education.school_course_id !== input.canonicalCourseId
  ) {
    throw primitiveError(
      "STALE_CONFLICT",
      "The linked education already carries a different course."
    );
  }
  const target: EducationTarget = {
    schoolId: input.canonicalSchoolId,
    courseId: input.canonicalCourseId,
    status: "Verified",
  };
  if (isTargetState(education, target)) return education;
  return guardedEducationPatch(
    education,
    { school_id: { _eq: input.canonicalSchoolId } },
    {
      school_course_id: input.canonicalCourseId,
      education_status: "Verified",
    },
    target
  );
}

export async function reconcileLinkedEducation(
  input: ReconcileLinkedEducationInput
): Promise<EducationRecord> {
  const educationId = requirePositiveInteger(input.educationId, "educationId");
  const requesterId = requirePositiveInteger(input.requesterId, "requesterId");
  requirePositiveInteger(input.canonicalSchoolId, "canonicalSchoolId");
  const education = await fetchEducationExact(educationId);
  if (education.user_id !== requesterId) {
    throw primitiveError(
      "OWNERSHIP_CONFLICT",
      "The requester does not own the linked education."
    );
  }
  if (education.education_status !== "Pending") {
    const desiredCourse = input.canonicalCourseId;
    if (
      education.education_status === "Verified" &&
      education.school_id === input.canonicalSchoolId &&
      (desiredCourse === null ||
        education.school_course_id === desiredCourse)
    ) {
      return education;
    }
    throw primitiveError(
      "STALE_CONFLICT",
      "Only a Pending linked education may be reconciled."
    );
  }
  switch (input.mode) {
    case "schoolAttendance":
      return reconcileSchoolAttendance(input, education);
    case "courseCompletion":
      requirePositiveInteger(input.canonicalCourseId, "canonicalCourseId");
      return reconcileCourseCompletion(input, education);
    default:
      return assertNever(input);
  }
}
