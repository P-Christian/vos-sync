import "server-only";

import { getPHTimeString } from "@/lib/utils";
import { patchRows } from "./directus";
import { routingError } from "./errors";
import { fetchEducation, fetchSchool, fetchSchoolRequest, SCHOOL_REQUEST_FIELDS } from "./records";
import { parseRouteAudit } from "./route-audit";
import { schoolRequestSchema } from "./schemas";
import type {
  AttendanceClaimInput,
  NormalizedRosterAcademics,
  RosterAcademicsInput,
  SchoolRequestRecord,
  TransitionOutcome,
} from "./types";

function normalizeOptionalText(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

export function normalizeRosterAcademics(input: RosterAcademicsInput): NormalizedRosterAcademics {
  const rawGpa = normalizeOptionalText(input.gpa);
  let gpa: number | null = null;
  if (rawGpa !== null) {
    const parsed = Number(rawGpa);
    const decimalPlaces = rawGpa.includes(".") ? rawGpa.split(".")[1]?.length ?? 0 : 0;
    if (!Number.isFinite(parsed) || Math.abs(parsed) > 999.99 || decimalPlaces > 2) {
      throw routingError("INVALID_INPUT", "GPA must be a finite decimal within decimal(5,2) precision.", 400);
    }
    gpa = parsed;
  }
  return {
    student_number: normalizeOptionalText(input.student_number),
    school_year: normalizeOptionalText(input.school_year),
    gpa,
  };
}

function replayMatches(request: SchoolRequestRecord, input: AttendanceClaimInput): boolean {
  return (
    request.request_status === "RoutedToSchool" &&
    request.matched_school_id === input.expectedSchoolId &&
    request.reviewed_by === input.reviewerId &&
    request.reviewed_at === input.replayClaim?.reviewed_at &&
    input.replayClaim?.reviewed_by === input.reviewerId
  );
}

function assertClaimableSource(request: SchoolRequestRecord, input: AttendanceClaimInput): void {
  if (input.callerSchoolId !== input.expectedSchoolId) {
    throw routingError("CLAIM_CONFLICT", "The School Admin caller is not the target school.");
  }
  if (request.request_status !== "RoutedToSchool" || request.matched_school_id !== input.expectedSchoolId) {
    throw routingError("CLAIM_CONFLICT", "The request is not routed to the caller's school.");
  }
  if (request.reviewed_by !== null || request.reviewed_at !== null) {
    throw routingError("CLAIM_CONFLICT", "The attendance claim already has a different reviewer or time.");
  }
  parseRouteAudit(request);
}

function assertEducationIdentity(
  request: SchoolRequestRecord,
  education: Awaited<ReturnType<typeof fetchEducation>>,
  expectedSchoolId: number
): void {
  if (
    education.user_id !== request.requested_by ||
    education.education_status !== "Pending" ||
    education.school_id !== expectedSchoolId
  ) {
    throw routingError("CORRELATION_CONFLICT", "The linked education is not consistent with the routed request.");
  }
}

export async function claimSchoolAttendance(input: AttendanceClaimInput): Promise<TransitionOutcome> {
  const request = await fetchSchoolRequest(input.requestId);
  if (input.replayClaim && replayMatches(request, input)) return { kind: "converged", request };
  assertClaimableSource(request, input);
  const [school, education] = await Promise.all([
    fetchSchool(input.expectedSchoolId),
    request.employee_education_id === null
      ? Promise.reject(routingError("CORRELATION_CONFLICT", "The routed request has no historical education link."))
      : fetchEducation(request.employee_education_id),
  ]);
  if (school.school_id !== input.expectedSchoolId) {
    throw routingError("CLAIM_CONFLICT", "The caller does not own the target school.");
  }
  assertEducationIdentity(request, education, input.expectedSchoolId);
  const updated = await patchRows(
    {
      operation: "schoolRequest.attendanceClaim",
      collection: "vs_school_request",
      filter: {
        school_request_id: { _eq: input.requestId },
        request_status: { _eq: "RoutedToSchool" },
        matched_school_id: { _eq: input.expectedSchoolId },
        reviewed_by: { _null: true },
        reviewed_at: { _null: true },
      },
      data: { reviewed_by: input.reviewerId, reviewed_at: getPHTimeString() },
      fields: SCHOOL_REQUEST_FIELDS,
    },
    schoolRequestSchema
  );
  if (updated) return { kind: "mutated", request: updated };
  const current = await fetchSchoolRequest(input.requestId);
  if (input.replayClaim && replayMatches(current, input)) return { kind: "converged", request: current };
  throw routingError("CLAIM_CONFLICT", "The attendance claim changed before completion.");
}
