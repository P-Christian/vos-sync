import "server-only";

import { z, type ZodType } from "zod";
import {
  dependencyError,
  fetchFirst,
  lookupPath,
  patchCollection,
} from "./invitation.directus";
import type {
  SchoolCourseRecord,
  SchoolRecord,
  SchoolStudentRecord,
  StudentInvitationRecord,
} from "./types";

const INVITATION_FIELDS =
  "invitation_id,student_id,school_id,token,expires_at,is_used,used_at,created_at";
const STUDENT_FIELDS =
  "student_id,school_id,first_name,last_name,email,school_course_id,school_year,registered_user_id,invitation_status";

const invitationSchema: ZodType<StudentInvitationRecord> = z.object({
  invitation_id: z.number().int(),
  student_id: z.number().int(),
  school_id: z.number().int(),
  token: z.string(),
  expires_at: z.string(),
  is_used: z.union([z.boolean(), z.number()]),
  used_at: z.string().nullable(),
  created_at: z.string(),
});

const studentSchema: ZodType<SchoolStudentRecord> = z.object({
  student_id: z.number().int(),
  school_id: z.number().int(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  school_course_id: z.number().int().nullable(),
  school_year: z
    .union([z.string(), z.number()])
    .transform((value) => String(value))
    .nullable(),
  registered_user_id: z.number().int().nullable(),
  invitation_status: z.enum(["Not Sent", "Invited", "Registered"]),
});

const schoolSchema: ZodType<SchoolRecord> = z.object({
  school_id: z.number().int(),
  school_name: z.string(),
});

const courseSchema: ZodType<SchoolCourseRecord> = z.object({
  school_course_id: z.number().int(),
  course_name: z.string(),
});

/** Find an invitation by its opaque token without consuming it. */
export function findInvitationByToken(
  token: string
): Promise<StudentInvitationRecord | null> {
  return fetchFirst(
    "invitation.findByToken",
    lookupPath({
      collection: "vs_student_invitation",
      field: "token",
      value: token,
      fields: INVITATION_FIELDS,
    }),
    invitationSchema
  );
}

/** Find an invitation by primary key for authoritative read-back. */
export function findInvitationById(
  invitationId: number
): Promise<StudentInvitationRecord | null> {
  return fetchFirst(
    "invitation.findById",
    lookupPath({
      collection: "vs_student_invitation",
      field: "invitation_id",
      value: invitationId,
      fields: INVITATION_FIELDS,
    }),
    invitationSchema
  );
}

/** Find the school roster row identified by an invitation. */
export function findStudentById(
  studentId: number
): Promise<SchoolStudentRecord | null> {
  return fetchFirst(
    "student.findById",
    lookupPath({
      collection: "vs_school_student",
      field: "student_id",
      value: studentId,
      fields: STUDENT_FIELDS,
    }),
    studentSchema
  );
}

export interface LinkStudentAccountInput {
  readonly studentId: number;
  readonly userId: string | number;
  readonly schoolId: number;
  readonly rosterEmail: string;
}

export type LinkStudentAccountResult =
  | {
      readonly kind: "linked";
      readonly student: SchoolStudentRecord;
      readonly created: boolean;
    }
  | { readonly kind: "conflict" };

function isSameOwner(
  student: SchoolStudentRecord,
  userId: string | number
): boolean {
  return (
    student.registered_user_id !== null &&
    String(student.registered_user_id) === String(userId)
  );
}

/**
 * Link the account only while the roster row is still unowned and still
 * matches the school and roster email the caller validated. A zero-row update
 * is classified by read-back: the same owner is idempotent, another owner is
 * a conflict, and a still-unowned row is a dependency failure. `created`
 * reports the conditional-update winner (the first write) as `true` and the
 * same-owner read-back as `false`, so the caller can release once-only
 * effects on the request that actually wrote the link.
 */
export async function linkStudentAccount(
  input: LinkStudentAccountInput
): Promise<LinkStudentAccountResult> {
  const updated = await patchCollection(
    {
      operation: "student.linkAccount",
      collection: "vs_school_student",
      filter: {
        student_id: { _eq: input.studentId },
        school_id: { _eq: input.schoolId },
        registered_user_id: { _null: true },
        email: { _eq: input.rosterEmail },
      },
      data: {
        registered_user_id: input.userId,
        invitation_status: "Registered",
      },
      fields: STUDENT_FIELDS,
    },
    studentSchema
  );
  if (
    updated &&
    updated.student_id === input.studentId &&
    isSameOwner(updated, input.userId)
  ) {
    return { kind: "linked", student: updated, created: true };
  }

  const current = await findStudentById(input.studentId);
  if (current && isSameOwner(current, input.userId)) {
    return { kind: "linked", student: current, created: false };
  }
  if (current && current.registered_user_id !== null) {
    return { kind: "conflict" };
  }
  throw dependencyError("student.linkAccount.readBack");
}

/**
 * Consume an accepted invitation. The guard keeps an already-consumed row and
 * its `used_at` untouched; the caller must verify the read-back before it
 * reports success.
 */
export async function consumeInvitation(
  invitationId: number
): Promise<StudentInvitationRecord | null> {
  await patchCollection(
    {
      operation: "invitation.consume",
      collection: "vs_student_invitation",
      filter: {
        invitation_id: { _eq: invitationId },
        is_used: { _eq: 0 },
      },
      data: { is_used: 1, used_at: new Date().toISOString() },
      fields: INVITATION_FIELDS,
    },
    invitationSchema
  );
  return findInvitationById(invitationId);
}

/** Find the school display record for an invitation preview. */
export function findSchoolById(schoolId: number): Promise<SchoolRecord | null> {
  return fetchFirst(
    "school.findById",
    lookupPath({
      collection: "vs_school",
      field: "school_id",
      value: schoolId,
      fields: "school_id,school_name",
    }),
    schoolSchema
  );
}

/** Find the course display record for an invitation preview. */
export function findCourseById(
  courseId: number
): Promise<SchoolCourseRecord | null> {
  return fetchFirst(
    "course.findById",
    lookupPath({
      collection: "vs_school_course",
      field: "school_course_id",
      value: courseId,
      fields: "school_course_id,course_name",
    }),
    courseSchema
  );
}
