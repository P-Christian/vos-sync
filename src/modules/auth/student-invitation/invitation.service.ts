import { maskEmail } from "@/modules/auth/registration/registration.crypto";
import { parseDirectusUtcDateTime } from "@/modules/auth/registration/registration.timestamps";
import type {
  SchoolCourseRecord,
  SchoolRecord,
  SchoolStudentRecord,
  StudentInvitationPreviewDto,
  StudentInvitationRecord,
} from "./types";

/** Records needed to build a student invitation preview. */
export interface BuildPreviewInput {
  readonly invitation: StudentInvitationRecord | null;
  readonly student: SchoolStudentRecord | null;
  readonly school: SchoolRecord | null;
  readonly course: SchoolCourseRecord | null;
  readonly now: number;
}

/** Classify invitation and roster ownership without exposing display data. */
export function getInvitationState(
  invitation: StudentInvitationRecord | null,
  student: SchoolStudentRecord | null,
  now: number
): StudentInvitationPreviewDto["state"] {
  if (!invitation || !student || invitation.school_id !== student.school_id) {
    return "invalid";
  }
  if (student.registered_user_id !== null) return "registered";
  if (invitation.is_used) return "used";

  const expiresAt = parseDirectusUtcDateTime(invitation.expires_at);
  return !Number.isFinite(expiresAt) || now >= expiresAt ? "expired" : "valid";
}

/** Whether the invitation is consumed: flag set and a valid `used_at`. */
export function isInvitationConsumed(
  invitation: StudentInvitationRecord | null | undefined
): boolean {
  if (!invitation) return false;
  const isUsed = invitation.is_used === true || invitation.is_used === 1;
  return isUsed && Number.isFinite(parseDirectusUtcDateTime(invitation.used_at));
}

/** Whether the roster row is linked to the given account. */
export function isLinkedToSession(
  student: SchoolStudentRecord | null | undefined,
  userId: string | number
): boolean {
  return (
    student !== null &&
    student !== undefined &&
    student.registered_user_id !== null &&
    String(student.registered_user_id) === String(userId)
  );
}

/**
 * Authoritative acceptance state: the roster row is owned by the session
 * account, carries the `Registered` status, and the invitation is fully
 * consumed. Success must never be reported without this state.
 */
export function isAuthoritativeLinkedState(
  student: SchoolStudentRecord | null | undefined,
  invitation: StudentInvitationRecord | null | undefined,
  sessionUserId: string | number
): boolean {
  return (
    student !== null &&
    student !== undefined &&
    student.invitation_status === "Registered" &&
    isLinkedToSession(student, sessionUserId) &&
    isInvitationConsumed(invitation)
  );
}

/** Build a masked, non-consuming preview from invitation lookup records. */
export function buildPreview(input: BuildPreviewInput): StudentInvitationPreviewDto {
  const { invitation, student, school, course, now } = input;
  if (!invitation || !student) return { state: "invalid" };
  const state = getInvitationState(invitation, student, now);
  if (state !== "valid") return { state };

  if (
    !school ||
    !course ||
    !student.first_name ||
    !student.email ||
    !student.school_year
  ) {
    return { state: "invalid" };
  }

  const expiresAt = parseDirectusUtcDateTime(invitation.expires_at);

  return {
    state: "valid",
    schoolName: school.school_name,
    courseName: course.course_name,
    schoolYear: student.school_year,
    studentFirstName: student.first_name,
    studentLastName: student.last_name ?? "",
    emailMasked: maskEmail(student.email),
    expiresAt: new Date(expiresAt).toISOString(),
  };
}
