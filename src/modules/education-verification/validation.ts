import "server-only";

import { normalizeSchoolIdentity as normalizeCanonicalSchoolIdentity } from "@/modules/school-identity";
import { primitiveError } from "./errors";

export function requirePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw primitiveError("INVALID_INPUT", `${field} must be a positive integer.`);
  }
  return value;
}

export function requireNonBlank(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw primitiveError("INVALID_INPUT", `${field} must not be empty.`);
  }
  return trimmed;
}

export function normalizeSchoolIdentity(value: string): string {
  return normalizeCanonicalSchoolIdentity(
    requireNonBlank(value, "school identity")
  );
}

export function assertNever(value: never): never {
  throw primitiveError(
    "INVALID_INPUT",
    `Unsupported education verification variant: ${String(value)}`
  );
}
