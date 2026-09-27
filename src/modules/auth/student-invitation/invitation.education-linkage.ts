import "server-only";

import { z, type ZodType } from "zod";
import {
  createItem,
  dependencyError,
  fetchFirst,
  fetchMany,
  lookupPath,
  patchCollection,
} from "./invitation.directus";
import type {
  EducationStatus,
  EmployeeEducationRecord,
  SchoolStudentRecord,
} from "./types";
import {
  findStudentById,
  STUDENT_FIELDS,
  studentSchema,
} from "./invitation.repo";

const EDUCATION_FIELDS =
  "employee_education_id,user_id,school_id,school_course_id,school_name_raw,course_name_raw,education_status,start_date,end_date";

function toEducationStatus(value: string | null): EducationStatus | null {
  switch (value) {
    case "Verified":
    case "Pending":
    case "Unverified":
      return value;
    default:
      return null;
  }
}

const employeeEducationSchema: ZodType<EmployeeEducationRecord> = z.object({
  employee_education_id: z.number().int(),
  user_id: z.number().int(),
  school_id: z.number().int().nullable(),
  school_course_id: z.number().int().nullable(),
  school_name_raw: z.string().nullable(),
  course_name_raw: z.string().nullable(),
  education_status: z.string().nullable().transform(toEducationStatus),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

/** Fetch one education row by primary key. An absent row is a normal result. */
export function fetchEmployeeEducationExact(
  educationId: number
): Promise<EmployeeEducationRecord | null> {
  return fetchFirst(
    "education.fetchExact",
    lookupPath({
      collection: "vs_employee_education",
      field: "employee_education_id",
      value: educationId,
      fields: EDUCATION_FIELDS,
    }),
    employeeEducationSchema
  );
}

/**
 * List at most two owned Pending rows for one canonical school/course pair.
 * The cap keeps ambiguity detectable; selection never consults raw names.
 */
export function listOwnedPendingCanonicalCandidates(
  userId: number,
  schoolId: number,
  schoolCourseId: number | null
): Promise<EmployeeEducationRecord[]> {
  const query = new URLSearchParams({
    "filter[user_id][_eq]": String(userId),
    "filter[school_id][_eq]": String(schoolId),
    "filter[education_status][_eq]": "Pending",
    fields: EDUCATION_FIELDS,
    limit: "2",
  });
  if (schoolCourseId === null) {
    query.set("filter[school_course_id][_null]", "true");
  } else {
    query.set("filter[school_course_id][_eq]", String(schoolCourseId));
  }
  return fetchMany(
    "education.listOwnedPendingCandidates",
    `/items/vs_employee_education?${query.toString()}`,
    employeeEducationSchema
  );
}

export interface VerifyOwnedEducationInput {
  readonly educationId: number;
  readonly userId: number;
  readonly schoolId: number;
  readonly schoolCourseId: number | null;
}

export type VerifyOwnedEducationResult =
  | { readonly kind: "verified"; readonly education: EmployeeEducationRecord }
  | {
      readonly kind: "conflict";
      readonly reason: "OWNER_MISMATCH" | "STATUS_MISMATCH";
    };

/**
 * Verify one owned Pending education row. The write only lands when the id,
 * owner, and Pending status all still hold; a zero-row write is classified by
 * exact read-back into a typed conflict. Already-advanced rows never verify.
 */
export async function patchOwnedPendingEducationVerified(
  input: VerifyOwnedEducationInput
): Promise<VerifyOwnedEducationResult> {
  const data: Record<string, unknown> = {
    school_id: input.schoolId,
    education_status: "Verified",
  };
  if (input.schoolCourseId !== null) {
    data["school_course_id"] = input.schoolCourseId;
  }
  const updated = await patchCollection(
    {
      operation: "education.verifyOwned",
      collection: "vs_employee_education",
      filter: {
        employee_education_id: { _eq: input.educationId },
        user_id: { _eq: input.userId },
        education_status: { _eq: "Pending" },
      },
      data,
      fields: EDUCATION_FIELDS,
    },
    employeeEducationSchema
  );
  if (updated) return { kind: "verified", education: updated };

  const current = await fetchEmployeeEducationExact(input.educationId);
  if (!current) throw dependencyError("education.verifyOwned.readBack");
  if (current.user_id !== input.userId) {
    return { kind: "conflict", reason: "OWNER_MISMATCH" };
  }
  if (current.education_status !== "Pending") {
    return { kind: "conflict", reason: "STATUS_MISMATCH" };
  }
  throw dependencyError("education.verifyOwned.guard");
}

export interface CreateVerifiedEducationInput {
  readonly userId: number;
  readonly schoolId: number;
  readonly schoolCourseId: number | null;
  readonly schoolNameRaw?: string | undefined;
  readonly courseNameRaw?: string | undefined;
}

/** Create one Verified education row from authoritative roster school/course. */
export async function createVerifiedEducationFromRoster(
  input: CreateVerifiedEducationInput
): Promise<EmployeeEducationRecord> {
  const created = await createItem(
    {
      operation: "education.createVerified",
      collection: "vs_employee_education",
      data: {
        user_id: input.userId,
        school_id: input.schoolId,
        school_course_id: input.schoolCourseId,
        school_name_raw: input.schoolNameRaw ?? null,
        course_name_raw: input.courseNameRaw ?? null,
        education_status: "Verified",
      },
      fields: EDUCATION_FIELDS,
    },
    employeeEducationSchema
  );
  if (!created) throw dependencyError("education.createVerified.readBack");
  return created;
}

export interface LinkRosterEducationInput {
  readonly studentId: number;
  readonly schoolId: number;
  readonly registeredUserId: number;
  readonly educationId: number;
}

export type LinkRosterEducationResult =
  | {
      readonly kind: "linked";
      readonly student: SchoolStudentRecord;
      readonly created: boolean;
    }
  | {
      readonly kind: "conflict";
      readonly reason: "ALREADY_LINKED" | "OWNER_MISMATCH";
    };

/**
 * Claim the roster linkage only while the row is still owned by the caller
 * and unlinked. A zero-row write is classified by exact read-back: the same
 * linkage is idempotent, a different linkage is a conflict, and a vanished
 * row is a dependency failure. `created` marks the write winner so callers
 * can release once-only effects exactly once.
 */
export async function linkRosterEducation(
  input: LinkRosterEducationInput
): Promise<LinkRosterEducationResult> {
  const updated = await patchCollection(
    {
      operation: "roster.linkEducation",
      collection: "vs_school_student",
      filter: {
        student_id: { _eq: input.studentId },
        school_id: { _eq: input.schoolId },
        registered_user_id: { _eq: input.registeredUserId },
        employee_education_id: { _null: true },
      },
      data: { employee_education_id: input.educationId },
      fields: STUDENT_FIELDS,
    },
    studentSchema
  );
  if (
    updated &&
    updated.employee_education_id === input.educationId &&
    updated.registered_user_id === input.registeredUserId
  ) {
    return { kind: "linked", student: updated, created: true };
  }

  const current = await findStudentById(input.studentId);
  if (!current) throw dependencyError("roster.linkEducation.readBack");
  if (
    current.employee_education_id === input.educationId &&
    current.registered_user_id === input.registeredUserId
  ) {
    return { kind: "linked", student: current, created: false };
  }
  if (current.employee_education_id !== null) {
    return { kind: "conflict", reason: "ALREADY_LINKED" };
  }
  return { kind: "conflict", reason: "OWNER_MISMATCH" };
}
