import "server-only";

export const VERIFICATION_ERROR_CODES = [
  "INVALID_INPUT",
  "INVALID_IDENTITY",
  "NOT_FOUND",
  "EVIDENCE_ABSENT",
  "ROSTER_ABSENT",
  "AMBIGUOUS",
  "OWNERSHIP_CONFLICT",
  "CORRELATION_CONFLICT",
  "CONCURRENT_CHANGE",
  "STALE_CONFLICT",
  "CLAIM_CONFLICT",
  "INVALID_ROUTE_AUDIT",
  "DEPENDENCY_FAILURE",
] as const;

export type VerificationPrimitiveErrorCode =
  (typeof VERIFICATION_ERROR_CODES)[number];

export class VerificationPrimitiveError extends Error {
  public readonly name = "VerificationPrimitiveError";

  constructor(
    public readonly code: VerificationPrimitiveErrorCode,
    message: string,
    public readonly dependencyStatus?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export function primitiveError(
  code: VerificationPrimitiveErrorCode,
  message: string
): VerificationPrimitiveError {
  return new VerificationPrimitiveError(code, message);
}
