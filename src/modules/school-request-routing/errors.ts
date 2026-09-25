import "server-only";

export const SCHOOL_REQUEST_ROUTING_ERROR_CODES = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "AMBIGUOUS",
  "STALE_CONFLICT",
  "CORRELATION_CONFLICT",
  "TARGET_INELIGIBLE",
  "INVALID_ROUTE_AUDIT",
  "CLAIM_CONFLICT",
  "DEPENDENCY_FAILURE",
  "UNSUPPORTED_ACTION",
] as const;

export type SchoolRequestRoutingErrorCode =
  (typeof SCHOOL_REQUEST_ROUTING_ERROR_CODES)[number];

export class SchoolRequestRoutingError extends Error {
  readonly name = "SchoolRequestRoutingError";

  constructor(
    readonly code: SchoolRequestRoutingErrorCode,
    message: string,
    readonly status: number = 409,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export function routingError(
  code: SchoolRequestRoutingErrorCode,
  message: string,
  status?: number
): SchoolRequestRoutingError {
  const resolvedStatus =
    status ??
    (code === "INVALID_INPUT"
      ? 400
      : code === "NOT_FOUND"
        ? 404
        : code === "DEPENDENCY_FAILURE"
          ? 502
          : 409);
  return new SchoolRequestRoutingError(code, message, resolvedStatus);
}
