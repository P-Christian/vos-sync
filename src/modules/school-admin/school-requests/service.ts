import "server-only";

import { resolveExactSchoolAssignment } from "./assignment.resolver";
import { invalidInputError } from "./errors";
import { fetchScopedRequest, listFinalizingForAssignment, listRoutedForAssignment } from "./repo";
import type { SchoolAssignment, SchoolRequestInbox, SchoolRequestInboxRow } from "./types";

function requireRequestId(requestId: number): number {
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw invalidInputError("A positive integer school request id is required.");
  }
  return requestId;
}

/**
 * School-scoped inbox for the calling admin. The exact-one assignment is
 * resolved FIRST; zero/multiple assignments fail closed before any request
 * query. Returns actionable `RoutedToSchool` decisions plus recoverable
 * `Approved`-finalizing rows, each expanded with linked education/course,
 * relevant dates, the persisted reviewer/time claim, and the requester id.
 */
export async function listSchoolRequestInbox(callerUserId: number): Promise<SchoolRequestInbox> {
  const assignment = await resolveExactSchoolAssignment(callerUserId);
  const [routed, finalizing] = await Promise.all([
    listRoutedForAssignment(assignment),
    listFinalizingForAssignment(assignment),
  ]);
  return {
    schoolId: assignment.schoolId,
    schoolAdminId: assignment.schoolAdminId,
    routed,
    finalizing,
  };
}

/**
 * Fetch one school-scoped request. Foreign-school resources and unknown ids
 * resolve to NOT_FOUND (typed 404) before any transition/status validation.
 */
export async function fetchSchoolRequestForSchool(
  callerUserId: number,
  requestId: number,
): Promise<{ assignment: SchoolAssignment; row: SchoolRequestInboxRow }> {
  return fetchScopedRequest(callerUserId, requireRequestId(requestId));
}
