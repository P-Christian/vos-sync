import "server-only";

import { syncVerifiedCourseRequest } from "@/modules/education-verification/verified-course-request-sync";
import type { PendingEducationWrite } from "./education-persistence.repo";
import {
  EducationUpdateError,
  fetchOwnedEducation,
  resolveCourseRequestName,
  updateVerifiedEducation,
  type AnyStatusEducation,
} from "./education-update.repo";

type VerifiedEducationEditInput = {
  readonly educationId: number;
  readonly userId: number;
  readonly write: PendingEducationWrite;
};

function normalizedRawCourse(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function courseChanged(
  existing: AnyStatusEducation,
  desired: PendingEducationWrite
): boolean {
  return (
    existing.school_course_id !== desired.school_course_id ||
    normalizedRawCourse(existing.course_name_raw) !==
      normalizedRawCourse(desired.course_name_raw)
  );
}

function requireLockedSchool(
  existing: AnyStatusEducation,
  desired: PendingEducationWrite
): void {
  if (
    existing.school_id !== desired.school_id ||
    existing.school_name_raw !== desired.school_name_raw
  ) {
    throw new EducationUpdateError(
      "The school is locked after attendance has been verified."
    );
  }
}

export async function updateVerifiedEducationClaim(
  input: VerifiedEducationEditInput
): Promise<AnyStatusEducation> {
  const existing = await fetchOwnedEducation(input.educationId, input.userId);
  if (existing.education_status !== "Verified") {
    throw new EducationUpdateError("This education record is not verified.");
  }
  requireLockedSchool(existing, input.write);

  const desired = {
    ...input.write,
    course_name_raw: normalizedRawCourse(input.write.course_name_raw),
    course_request_draft_key: existing.course_request_draft_key,
  } satisfies PendingEducationWrite;
  const changed = courseChanged(existing, desired);
  const requestedCourseName = changed
    ? await resolveCourseRequestName(desired)
    : null;

  await syncVerifiedCourseRequest({
    educationId: existing.employee_education_id,
    schoolId: existing.school_id,
    requesterId: existing.user_id,
    requestedCourseName,
    courseChanged: changed,
  });
  return updateVerifiedEducation(input.educationId, input.userId, desired);
}
