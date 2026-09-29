import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  RosterHttpError,
  resolveSchoolAdminContext,
} from "@/modules/school-admin/student-roster/services/roster-auth";
import {
  CourseRequestSchoolAdminError,
  courseRequestDecisionInputSchema,
  type CourseRequestSchoolAdminErrorCode,
} from "@/modules/school-admin/course-requests";
import { VerificationPrimitiveError } from "@/modules/education-verification";

export type CourseAdminSession = { readonly userId: number; readonly schoolId: number };

/**
 * Authorization gate: SCHOOL_ADMIN role AND exactly one active school
 * assignment, both resolved server-side from the signed cookie. Zero, multiple,
 * or malformed assignments throw 403; missing/invalid token throws 401; a
 * non-School role throws 403. Callers must run this BEFORE any course-request
 * or course lookup so no foreign row is ever read.
 */
export async function requireSchoolAdminSession(req: NextRequest): Promise<CourseAdminSession> {
  const session = await resolveSchoolAdminContext(req);
  return { userId: session.userId, schoolId: session.schoolId };
}

/**
 * Strict closed-world decision body. `.strict()` on each
 * variant rejects every unknown key, so a forged school id, requester
 * identity, reviewer, education id, status, roster, or academics override
 * fails validation (400) instead of being silently dropped. Approve carries
 * only the positive canonical course id; reject carries only trimmed
 * non-blank remarks.
 */
export const decisionSchema = courseRequestDecisionInputSchema;

export type CourseDecisionBody = z.infer<typeof decisionSchema>;

/** Typed 400 for path-parameter failures detected before Zod body parsing. */
export class InvalidDecisionInputError extends Error {
  readonly status = 400;
}

export function parsePositiveId(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/u.test(raw)) {
    throw new InvalidDecisionInputError("A positive integer course request id is required.");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidDecisionInputError("A positive integer course request id is required.");
  }
  return value;
}

function envelope(message: string, code: CourseRequestSchoolAdminErrorCode, status: number): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

function sanitizedDependency(): NextResponse {
  return envelope("Service temporarily unavailable.", "DEPENDENCY_FAILURE", 503);
}

/**
 * Consistent status mapping with the typed error codes: 401
 * (UNAUTHENTICATED token), 403 (FORBIDDEN role / assignment), 404 (NOT_FOUND
 * foreign or absent), 400 (INVALID_INPUT malformed input), 409 (literal domain
 * conflicts), 503 (sanitized DEPENDENCY_FAILURE). Storage bodies, raw Directus
 * payloads, and internal error strings never cross this boundary.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof InvalidDecisionInputError) {
    return envelope(error.message, "INVALID_INPUT", 400);
  }
  if (error instanceof RosterHttpError) {
    if (error.status === 401) return envelope("Authentication is required.", "UNAUTHENTICATED", 401);
    if (error.status === 403) {
      return envelope("This administrator is not authorized for this school.", "FORBIDDEN", 403);
    }
    return sanitizedDependency();
  }
  if (error instanceof CourseRequestSchoolAdminError) {
    if (error.code === "DEPENDENCY_FAILURE") return sanitizedDependency();
    return envelope(error.message, error.code, error.status);
  }
  if (error instanceof VerificationPrimitiveError) {
    if (error.code === "DEPENDENCY_FAILURE") return sanitizedDependency();
    return envelope("Course request state conflicts with persisted records.", "STATE_CONFLICT", 409);
  }
  if (error instanceof ZodError) {
    const [issue] = error.issues;
    return envelope(issue?.message ?? "Malformed decision body.", "INVALID_INPUT", 400);
  }
  if (error instanceof SyntaxError) return envelope("Malformed request body.", "INVALID_INPUT", 400);
  return sanitizedDependency();
}
