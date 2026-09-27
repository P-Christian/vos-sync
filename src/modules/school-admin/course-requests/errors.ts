import "server-only";

export const COURSE_REQUEST_CONFLICT_CODES = [
  "ROUTE_AUDIT_CONFLICT",
  "STATE_CONFLICT",
  "COURSE_CONFLICT",
  "EVIDENCE_CONFLICT",
  "ROSTER_CONFLICT",
  "REPLAY_CONFLICT",
] as const;

export const COURSE_REQUEST_SCHOOL_ADMIN_ERROR_CODES = [
  ...COURSE_REQUEST_CONFLICT_CODES,
  "INVALID_INPUT",
  "NOT_FOUND",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "DEPENDENCY_FAILURE",
] as const;

export type CourseRequestSchoolAdminErrorCode =
  (typeof COURSE_REQUEST_SCHOOL_ADMIN_ERROR_CODES)[number];

/**
 * Typed failure for the school-scoped course-request module. Auth failures
 * are raised BEFORE any request lookup; foreign/absent resources resolve to
 * NOT_FOUND (404) before transition validation so no cross-school existence
 * leaks. Only transport/config/malformed dependency failures map to
 * DEPENDENCY_FAILURE (503).
 */
export class CourseRequestSchoolAdminError extends Error {
  readonly name = "CourseRequestSchoolAdminError";

  constructor(
    readonly code: CourseRequestSchoolAdminErrorCode,
    message: string,
    readonly status: number = 409,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export function courseRequestError(
  code: CourseRequestSchoolAdminErrorCode,
  message: string,
  status?: number,
  options?: ErrorOptions,
): CourseRequestSchoolAdminError {
  const resolvedStatus =
    status ??
    (code === "INVALID_INPUT"
      ? 400
      : code === "NOT_FOUND"
        ? 404
        : code === "UNAUTHENTICATED"
          ? 401
          : code === "FORBIDDEN"
            ? 403
            : code === "DEPENDENCY_FAILURE"
              ? 503
              : 409);
  return new CourseRequestSchoolAdminError(code, message, resolvedStatus, options);
}

/**
 * Sanitized dependency failure. Never include a Directus response body: it
 * can carry roster, request, or identity field values that must not cross
 * this module boundary.
 */
export function dependencyError(operation: string, status?: number, cause?: unknown): CourseRequestSchoolAdminError {
  console.error("[course-requests] Directus operation failed", { operation, status });
  return courseRequestError("DEPENDENCY_FAILURE", "Course request storage is temporarily unavailable.", 503, {
    cause,
  });
}

export function scopedNotFound(): CourseRequestSchoolAdminError {
  return courseRequestError("NOT_FOUND", "Course request was not found.");
}

export function invalidInputError(message: string): CourseRequestSchoolAdminError {
  return courseRequestError("INVALID_INPUT", message);
}

export function unauthenticatedError(): CourseRequestSchoolAdminError {
  return courseRequestError("UNAUTHENTICATED", "Authentication is required.");
}

export function forbiddenError(): CourseRequestSchoolAdminError {
  return courseRequestError("FORBIDDEN", "This administrator is not authorized for this school.");
}
