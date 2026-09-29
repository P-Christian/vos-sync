import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  RosterHttpError,
  resolveSchoolAdminContext,
} from "@/modules/school-admin/student-roster/services/roster-auth";
import { SchoolRequestSchoolAdminError } from "@/modules/school-admin/school-requests";
import type { AttendanceAcademics } from "@/modules/school-admin/school-requests";
import { SchoolRequestRoutingError } from "@/modules/school-request-routing";
import { VerificationPrimitiveError } from "@/modules/education-verification";

export type SchoolAdminSession = { readonly userId: number; readonly schoolId: number };

const STUDENT_NUMBER = /^[A-Za-z0-9][A-Za-z0-9\- ]*$/u;
const SCHOOL_YEAR = /^\d{4}$/u;

/**
 * Authorization gate: SCHOOL_ADMIN role AND exactly one active school
 * assignment, both resolved server-side from the signed cookie. Zero/multiple
 * assignments throw 403; missing/invalid token throws 401; a non-School role
 * throws 403. Callers must run this BEFORE any request lookup so no foreign
 * row is ever read.
 */
export async function requireSchoolAdminSession(req: NextRequest): Promise<SchoolAdminSession> {
  const session = await resolveSchoolAdminContext(req);
  return { userId: session.userId, schoolId: session.schoolId };
}

/**
 * Closed-world decision body. `.strict()` rejects every unknown key, so a
 * forged school id, requester identity, education id, course id, status, or
 * `is_alumni` override fails validation (400) instead of being silently
 * dropped. The only accepted inputs are the decision plus the three optional
 * academic fields.
 */
const approveSchema = z
  .object({
    action: z.literal("approve"),
    student_number: z.union([z.string(), z.number()]).optional(),
    gpa: z.union([z.string(), z.number()]).optional(),
    school_year: z.union([z.string(), z.number()]).optional(),
  })
  .strict();

const rejectSchema = z
  .object({
    action: z.literal("reject"),
    remarks: z.string().trim().min(1, "Rejection remarks must not be blank."),
  })
  .strict();

export const decisionSchema = z.discriminatedUnion("action", [approveSchema, rejectSchema]);

export type SchoolDecisionBody = z.infer<typeof decisionSchema>;

/** Typed 400 for body-shape failures detected after Zod parsing. */
export class InvalidDecisionInputError extends Error {
  readonly status = 400;
}

/**
 * Normalize + validate the optional academics once. GPA must be numeric within
 * 0..5, school_year a four-digit year, and student_number a safe identifier.
 * Anything malformed throws a 400 before the saga is invoked.
 */
export function normalizeAcademics(input: {
  readonly student_number?: string | number;
  readonly gpa?: string | number;
  readonly school_year?: string | number;
}): AttendanceAcademics {
  const academics: {
    student_number?: string;
    gpa?: number;
    school_year?: string;
  } = {};

  if (input.student_number !== undefined && input.student_number !== null) {
    const value = String(input.student_number).trim();
    if (value.length === 0 || !STUDENT_NUMBER.test(value)) {
      throw new InvalidDecisionInputError("student_number has an invalid format.");
    }
    academics.student_number = value;
  }

  if (input.gpa !== undefined && input.gpa !== null && String(input.gpa).trim() !== "") {
    const value = Number(input.gpa);
    if (!Number.isFinite(value) || value < 0 || value > 5) {
      throw new InvalidDecisionInputError("GPA must be between 0 and 5.");
    }
    academics.gpa = value;
  }

  if (input.school_year !== undefined && input.school_year !== null && String(input.school_year).trim() !== "") {
    const value = String(input.school_year).trim();
    if (!SCHOOL_YEAR.test(value)) {
      throw new InvalidDecisionInputError("school_year must be a four-digit year.");
    }
    academics.school_year = value;
  }

  return academics;
}

export function parsePositiveId(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/u.test(raw)) {
    throw new InvalidDecisionInputError("A positive integer school request id is required.");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidDecisionInputError("A positive integer school request id is required.");
  }
  return value;
}

function json(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function sanitizedDependency(): NextResponse {
  return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
}

/**
 * Consistent status mapping: 401 (token), 403 (role / assignment), 404
 * (foreign or absent), 400 (malformed input), 409 (stale/conflicting), 503
 * (sanitized dependency failure). Storage internals never cross this boundary.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof InvalidDecisionInputError) return json(error.message, 400);
  if (error instanceof RosterHttpError) {
    if (error.status === 503) return sanitizedDependency();
    return json(error.message, error.status);
  }
  if (error instanceof SchoolRequestSchoolAdminError) {
    switch (error.code) {
      case "INVALID_INPUT":
        return json(error.message, 400);
      case "NO_ACTIVE_ASSIGNMENT":
      case "MULTIPLE_ACTIVE_ASSIGNMENTS":
        return json(error.message, 403);
      case "NOT_FOUND":
        return json("School request was not found.", 404);
      case "DEPENDENCY_FAILURE":
        return sanitizedDependency();
    }
  }
  if (error instanceof SchoolRequestRoutingError) {
    if (error.code === "INVALID_INPUT") return json(error.message, 400);
    if (error.code === "NOT_FOUND") return json("School request was not found.", 404);
    if (error.code === "DEPENDENCY_FAILURE") return sanitizedDependency();
    return json(error.message, 409);
  }
  if (error instanceof VerificationPrimitiveError) {
    if (error.code === "DEPENDENCY_FAILURE") return sanitizedDependency();
    if (error.code === "INVALID_INPUT" || error.code === "INVALID_IDENTITY") return json(error.message, 400);
    if (error.code === "NOT_FOUND" || error.code === "EVIDENCE_ABSENT" || error.code === "ROSTER_ABSENT") {
      return json("School request was not found.", 404);
    }
    return json(error.message, 409);
  }
  if (error instanceof ZodError) {
    const [issue] = error.issues;
    return json(issue?.message ?? "Malformed decision body.", 400);
  }
  if (error instanceof SyntaxError) return json("Malformed request body.", 400);
  return sanitizedDependency();
}
