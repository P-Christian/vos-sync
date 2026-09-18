import "server-only";

import type { StudentInvitationErrorCode } from "./errors";
import {
  consumeInvitation,
  findInvitationById,
  findStudentById,
} from "./invitation.repo";
import {
  isAuthoritativeLinkedState,
  isInvitationConsumed,
  isLinkedToSession,
} from "./invitation.service";
import type { SchoolStudentRecord, StudentInvitationRecord } from "./types";

/** Acceptance failure safe for route-level translation. */
export class StudentInvitationAcceptanceError extends Error {
  public readonly name = "StudentInvitationAcceptanceError";

  constructor(
    public readonly statusCode: 409 | 503,
    public readonly code: StudentInvitationErrorCode
  ) {
    super("Student invitation acceptance could not be completed.");
  }
}

export interface OwnedAcceptanceInput {
  readonly sessionUserId: string | number;
  readonly invitation: StudentInvitationRecord;
  readonly student: SchoolStudentRecord;
}

/**
 * Finish and confirm acceptance for an invitation whose roster row is already
 * owned by the session account. Consumption is reconciled when incomplete,
 * and success is reported only after a read-back proves the authoritative
 * owner, `Registered` status, and consumed invitation. An incomplete or
 * ambiguous state throws 503 instead of reporting a false success.
 */
export async function completeOwnedAcceptance(
  input: OwnedAcceptanceInput
): Promise<void> {
  const { sessionUserId, student } = input;
  let invitation = input.invitation;

  if (!isInvitationConsumed(invitation)) {
    const consumed = await consumeInvitation(invitation.invitation_id);
    if (consumed) invitation = consumed;
  }

  if (isAuthoritativeLinkedState(student, invitation, sessionUserId)) return;

  const [freshInvitation, freshStudent] = await Promise.all([
    findInvitationById(invitation.invitation_id),
    findStudentById(student.student_id),
  ]);
  if (!freshInvitation || !freshStudent) {
    throw new StudentInvitationAcceptanceError(503, "SERVICE_UNAVAILABLE");
  }
  if (!isLinkedToSession(freshStudent, sessionUserId)) {
    throw freshStudent.registered_user_id === null
      ? new StudentInvitationAcceptanceError(503, "SERVICE_UNAVAILABLE")
      : new StudentInvitationAcceptanceError(
          409,
          "INVITATION_OWNERSHIP_CONFLICT"
        );
  }
  if (
    !isAuthoritativeLinkedState(freshStudent, freshInvitation, sessionUserId)
  ) {
    throw new StudentInvitationAcceptanceError(503, "SERVICE_UNAVAILABLE");
  }
}
