import "server-only";

import { z } from "zod";
import {
  createVerifiedEducationFromRoster,
  fetchEmployeeEducationExact,
  linkRosterEducation,
  listOwnedPendingCanonicalCandidates,
  patchOwnedPendingEducationVerified,
} from "./invitation.education-linkage";
import { deleteItem, fetchMany } from "./invitation.directus";
import { findSchoolById, findStudentById } from "./invitation.repo";
import { toEducationUserId } from "./education.rules";
import type { StudentInvitationErrorCode } from "./errors";
import type {
  EmployeeEducationRecord,
  SchoolStudentRecord,
} from "./types";

const educationSyncLocks = new Map<string, Promise<void>>();

const educationReferenceSchema = z.object({
  active_employee_education_id: z.number().int().nullable(),
});

export interface EducationSyncInput {
  readonly userId: string | number;
  readonly student: SchoolStudentRecord;
}

export interface RosterEducationSyncResult {
  readonly educationId: number;
  readonly student: SchoolStudentRecord;
}

/** Required-sync failure safe for route-level translation. */
export class StudentInvitationEducationError extends Error {
  public readonly name = "StudentInvitationEducationError";

  constructor(
    public readonly statusCode: 400 | 409 | 503,
    public readonly code: StudentInvitationErrorCode
  ) {
    super("Student invitation education synchronization failed.");
  }
}

export async function withEducationSyncLock<T>(
  key: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = educationSyncLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const completion = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = previous.then(() => completion);
  educationSyncLocks.set(key, chain);

  await previous;
  try {
    return await task();
  } finally {
    release();
    if (educationSyncLocks.get(key) === chain) educationSyncLocks.delete(key);
  }
}

function ownershipConflict(): StudentInvitationEducationError {
  return new StudentInvitationEducationError(
    409,
    "INVITATION_OWNERSHIP_CONFLICT"
  );
}

function unavailable(): StudentInvitationEducationError {
  return new StudentInvitationEducationError(503, "SERVICE_UNAVAILABLE");
}

/**
 * Synchronize the roster row with its exact education row. Roster linkage
 * wins: a linked roster converges its exact row, an unlinked roster reuses
 * zero or one canonical owned Pending candidate, and two candidates fail as
 * ambiguity without writing anything. The guarded roster claim decides the
 * concurrent winner; a loser execution converges on the winner and removes
 * only a row it created itself that nothing references. Every failure throws
 * so callers finalize the invitation only after the link is persisted.
 */
export async function synchronizeRosterEducation(
  input: EducationSyncInput
): Promise<RosterEducationSyncResult> {
  const userId = toEducationUserId(input.userId);
  if (userId === null) {
    throw new StudentInvitationEducationError(400, "INVALID_REQUEST");
  }
  return withEducationSyncLock(`${input.student.student_id}`, () =>
    convergeRosterEducation(userId, input.student)
  );
}

async function convergeRosterEducation(
  userId: number,
  student: SchoolStudentRecord
): Promise<RosterEducationSyncResult> {
  const roster = await findStudentById(student.student_id);
  if (!roster) throw unavailable();
  if (roster.registered_user_id !== userId) throw ownershipConflict();

  if (roster.employee_education_id !== null) {
    return convergeExactEducation(userId, roster, roster.employee_education_id);
  }

  const candidates = await listOwnedPendingCanonicalCandidates(
    userId,
    roster.school_id,
    roster.school_course_id
  );
  if (candidates.length > 1) {
    throw new StudentInvitationEducationError(409, "EDUCATION_AMBIGUOUS");
  }

  const single = candidates[0] ?? null;
  if (single) {
    const verified = await verifyCandidateOrConverge(userId, roster, single);
    return claimRosterEducation(userId, verified.roster, verified.educationId, null);
  }

  const school = await findSchoolById(roster.school_id);
  const created = await createVerifiedEducationFromRoster({
    userId,
    schoolId: roster.school_id,
    schoolCourseId: roster.school_course_id,
    schoolNameRaw: school?.school_name ?? undefined,
  });
  return claimRosterEducation(userId, roster, created.employee_education_id, created.employee_education_id);
}

async function verifyCandidateOrConverge(
  userId: number,
  roster: SchoolStudentRecord,
  candidate: EmployeeEducationRecord
): Promise<{ readonly roster: SchoolStudentRecord; readonly educationId: number }> {
  const result = await patchOwnedPendingEducationVerified({
    educationId: candidate.employee_education_id,
    userId,
    schoolId: roster.school_id,
    schoolCourseId: roster.school_course_id,
  });
  if (result.kind === "verified") {
    return { roster, educationId: result.education.employee_education_id };
  }
  const current = await findStudentById(roster.student_id);
  if (current && current.employee_education_id !== null) {
    const winner = await convergeExactEducation(
      userId,
      current,
      current.employee_education_id
    );
    return { roster: winner.student, educationId: winner.educationId };
  }
  throw unavailable();
}

async function claimRosterEducation(
  userId: number,
  roster: SchoolStudentRecord,
  educationId: number,
  createdBySelf: number | null
): Promise<RosterEducationSyncResult> {
  const claim = await linkRosterEducation({
    studentId: roster.student_id,
    schoolId: roster.school_id,
    registeredUserId: userId,
    educationId,
  });
  if (claim.kind === "linked") {
    return { educationId, student: claim.student };
  }
  if (claim.reason === "OWNER_MISMATCH") throw ownershipConflict();

  const winner = await findStudentById(roster.student_id);
  if (!winner || winner.employee_education_id === null) throw unavailable();
  const converged = await convergeExactEducation(
    userId,
    winner,
    winner.employee_education_id
  );
  if (createdBySelf !== null && createdBySelf !== converged.educationId) {
    await compensateLoserEducation(userId, roster.student_id, createdBySelf);
  }
  return converged;
}

async function convergeExactEducation(
  userId: number,
  roster: SchoolStudentRecord,
  educationId: number
): Promise<RosterEducationSyncResult> {
  const exact = await fetchEmployeeEducationExact(educationId);
  if (!exact || exact.user_id !== userId) throw ownershipConflict();
  if (exact.education_status === "Verified") {
    return { educationId, student: roster };
  }
  if (exact.education_status !== "Pending") throw unavailable();
  const result = await patchOwnedPendingEducationVerified({
    educationId,
    userId,
    schoolId: roster.school_id,
    schoolCourseId: roster.school_course_id,
  });
  if (result.kind === "verified") {
    return { educationId: result.education.employee_education_id, student: roster };
  }
  const reread = await fetchEmployeeEducationExact(educationId);
  if (reread && reread.user_id === userId && reread.education_status === "Verified") {
    return { educationId, student: roster };
  }
  throw unavailable();
}

async function compensateLoserEducation(
  userId: number,
  studentId: number,
  loserId: number
): Promise<void> {
  try {
    const roster = await findStudentById(studentId);
    if (!roster || roster.employee_education_id === loserId) return;
    const loser = await fetchEmployeeEducationExact(loserId);
    if (!loser || loser.user_id !== userId) return;
    const references = await fetchMany(
      "education.findLoserReferences",
      `/items/vs_school_request?filter[active_employee_education_id][_eq]=${loserId}&fields=active_employee_education_id&limit=1`,
      educationReferenceSchema
    );
    if (references.length > 0) return;
    await deleteItem({
      operation: "education.compensateLoser",
      collection: "vs_employee_education",
      id: loserId,
    });
  } catch (error: unknown) {
    console.error("[student-invitation.education] Loser compensation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      studentId,
    });
  }
}
