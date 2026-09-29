import "server-only";

export const SCHOOL_REQUEST_SCHOOL_ADMIN_ERROR_CODES = [
  "INVALID_INPUT",
  "NO_ACTIVE_ASSIGNMENT",
  "MULTIPLE_ACTIVE_ASSIGNMENTS",
  "NOT_FOUND",
  "DEPENDENCY_FAILURE",
] as const;

export type SchoolRequestSchoolAdminErrorCode =
  (typeof SCHOOL_REQUEST_SCHOOL_ADMIN_ERROR_CODES)[number];

/**
 * Typed failure for the school-scoped school-request repository. Assignment
 * failures are authorization failures (403) and are raised BEFORE any
 * request lookup; foreign-school resources resolve to NOT_FOUND (404) before
 * any transition/status validation so no cross-school existence leaks.
 */
export class SchoolRequestSchoolAdminError extends Error {
  readonly name = "SchoolRequestSchoolAdminError";

  constructor(
    readonly code: SchoolRequestSchoolAdminErrorCode,
    message: string,
    readonly status: number = 409,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export function schoolRequestError(
  code: SchoolRequestSchoolAdminErrorCode,
  message: string,
  status?: number,
  options?: ErrorOptions,
): SchoolRequestSchoolAdminError {
  const resolvedStatus =
    status ??
    (code === "INVALID_INPUT"
      ? 400
      : code === "NO_ACTIVE_ASSIGNMENT" || code === "MULTIPLE_ACTIVE_ASSIGNMENTS"
        ? 403
        : code === "NOT_FOUND"
          ? 404
          : code === "DEPENDENCY_FAILURE"
            ? 502
            : 409);
  return new SchoolRequestSchoolAdminError(code, message, resolvedStatus, options);
}

/**
 * Sanitized dependency failure. Never include a Directus response body: it
 * can carry roster or request field values that must not cross this module
 * boundary.
 */
export function dependencyError(operation: string, status?: number, cause?: unknown): SchoolRequestSchoolAdminError {
  console.error("[school-requests] Directus operation failed", { operation, status });
  return schoolRequestError("DEPENDENCY_FAILURE", "School request storage is temporarily unavailable.", 502, {
    cause,
  });
}

export function assignmentError(
  code: "NO_ACTIVE_ASSIGNMENT" | "MULTIPLE_ACTIVE_ASSIGNMENTS",
): SchoolRequestSchoolAdminError {
  return schoolRequestError(
    code,
    code === "NO_ACTIVE_ASSIGNMENT"
      ? "No active school assignment was found for this administrator."
      : "Multiple active school assignments were found for this administrator.",
  );
}

export function scopedNotFound(): SchoolRequestSchoolAdminError {
  return schoolRequestError("NOT_FOUND", "School request was not found.");
}

export function invalidInputError(message: string): SchoolRequestSchoolAdminError {
  return schoolRequestError("INVALID_INPUT", message);
}
