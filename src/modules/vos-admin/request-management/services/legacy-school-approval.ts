// Exact-ID guarded reconcile for legacy school-request approval.
// A legacy approval verifies exactly the Pending education the request links
// to: the request is read before any mutation, the link must be a positive
// education id owned by the requester, and the verification patch is guarded
// by education id + owner + Pending status so siblings are never touched. A
// raw course on that exact education opens an education-scoped follow-on
// course request. Missing links fail closed without writing anything.
import "server-only";

import { ensureCourseRequest } from "../../../education-verification";
import {
  EDUCATION_FIELDS,
  fetchEducationExact,
} from "../../../education-verification/records";
import { patchRows } from "../../../education-verification/directus";
import { VerificationPrimitiveError } from "../../../education-verification/errors";
import {
  educationSchema,
  type EducationRecord,
} from "../../../education-verification/schemas";
import {
  fetchSchoolRequest as fetchRoutingSchoolRequest,
  SchoolRequestRoutingError,
} from "../../../school-request-routing";

function toRoutingError(
  error: unknown,
  fallback: string,
): SchoolRequestRoutingError {
  if (error instanceof SchoolRequestRoutingError) return error;
  if (error instanceof VerificationPrimitiveError) {
    switch (error.code) {
      case "DEPENDENCY_FAILURE":
        return new SchoolRequestRoutingError(
          "DEPENDENCY_FAILURE",
          "Education verification storage is temporarily unavailable.",
          502,
        );
      case "NOT_FOUND":
        return new SchoolRequestRoutingError(
          "CORRELATION_CONFLICT",
          "The linked education was not found.",
          409,
        );
      case "INVALID_INPUT":
      case "INVALID_IDENTITY":
        return new SchoolRequestRoutingError(
          "INVALID_INPUT",
          error.message,
          400,
        );
      case "AMBIGUOUS":
        return new SchoolRequestRoutingError(
          "AMBIGUOUS",
          error.message,
          409,
        );
      case "OWNERSHIP_CONFLICT":
      case "CORRELATION_CONFLICT":
        return new SchoolRequestRoutingError(
          "CORRELATION_CONFLICT",
          error.message,
          409,
        );
      default:
        return new SchoolRequestRoutingError(
          "STALE_CONFLICT",
          error.message,
          409,
        );
    }
  }
  return new SchoolRequestRoutingError("DEPENDENCY_FAILURE", fallback, 502);
}

/**
 * Read the request before any mutation and resolve its exact linked
 * education. A missing or non-positive link fails closed here, before the
 * request patch, so a null-linked approval writes nothing.
 */
export async function resolveLegacyApprovalTarget(
  requestId: number,
): Promise<EducationRecord> {
  let requestedBy: number;
  let linkedId: number | null;
  try {
    const request = await fetchRoutingSchoolRequest(requestId);
    requestedBy = request.requested_by;
    linkedId = request.employee_education_id;
  } catch (error: unknown) {
    if (error instanceof SchoolRequestRoutingError) throw error;
    throw new SchoolRequestRoutingError(
      "DEPENDENCY_FAILURE",
      "School request storage is temporarily unavailable.",
      502,
    );
  }
  if (linkedId === null || !Number.isInteger(linkedId) || linkedId <= 0) {
    throw new SchoolRequestRoutingError(
      "CORRELATION_CONFLICT",
      "The school request has no linked education.",
      409,
    );
  }
  const educationId: number = linkedId;
  let education: EducationRecord;
  try {
    education = await fetchEducationExact(educationId);
  } catch (error: unknown) {
    throw toRoutingError(error, "Education storage is temporarily unavailable.");
  }
  if (education.user_id !== requestedBy) {
    throw new SchoolRequestRoutingError(
      "CORRELATION_CONFLICT",
      "The linked education does not belong to this request.",
      409,
    );
  }
  if (education.education_status !== "Pending") {
    throw new SchoolRequestRoutingError(
      "STALE_CONFLICT",
      "Only a Pending linked education may be approved.",
      409,
    );
  }
  return education;
}

/**
 * Verify exactly the resolved education after the request patch. The patch
 * filter carries education id + owner + Pending status, so a concurrent
 * change matches zero rows instead of touching a sibling. A zero-row patch
 * converges only on an exact replay of an already-converged verification.
 */
export async function verifyLegacyApprovalTarget(
  education: EducationRecord,
  canonicalSchoolId: number,
): Promise<void> {
  let updated: EducationRecord | null;
  try {
    updated = await patchRows(
      {
        operation: "legacySchoolApproval.verifyEducation",
        collection: "vs_employee_education",
        filter: {
          employee_education_id: { _eq: education.employee_education_id },
          user_id: { _eq: education.user_id },
          education_status: { _eq: "Pending" },
        },
        data: {
          school_id: canonicalSchoolId,
          education_status: "Verified",
        },
        fields: EDUCATION_FIELDS,
      },
      educationSchema,
    );
  } catch (error: unknown) {
    throw toRoutingError(error, "Education storage is temporarily unavailable.");
  }
  let verified: EducationRecord | null = updated;
  if (verified === null) {
    let current: EducationRecord;
    try {
      current = await fetchEducationExact(education.employee_education_id);
    } catch (error: unknown) {
      throw toRoutingError(
        error,
        "Education storage is temporarily unavailable.",
      );
    }
    const converged =
      current.user_id === education.user_id &&
      current.school_id === canonicalSchoolId &&
      current.education_status === "Verified";
    if (!converged) {
      throw new SchoolRequestRoutingError(
        "STALE_CONFLICT",
        "The linked education changed before verification.",
        409,
      );
    }
    verified = current;
  }
  const rawCourse = verified.course_name_raw?.trim() ?? "";
  if (rawCourse.length === 0 || verified.school_course_id !== null) return;
  try {
    await ensureCourseRequest({
      educationId: verified.employee_education_id,
      schoolId: canonicalSchoolId,
      requestedCourseName: rawCourse,
    });
  } catch (error: unknown) {
    throw toRoutingError(
      error,
      "Course request storage is temporarily unavailable.",
    );
  }
}
