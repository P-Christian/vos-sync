/**
 * Read-only census classifier for legacy education links.
 *
 * This module is pure: it performs no network access, holds no mutable
 * state, and never writes. Given one request row (course or school) and
 * that request's candidate education rows, it reports exactly one of four
 * outcomes. Candidate matching reuses canonical identifiers and normalized
 * display names for reporting only; a report can never bind a request.
 */

export type LegacyLinkStatus =
  | "linked"
  | "deterministic_candidate"
  | "missing_candidate"
  | "ambiguous_candidate";

export type AuditCourseRequest = {
  readonly kind: "course";
  readonly course_request_id: number;
  readonly employee_education_id: number | null;
  readonly requested_by: number;
  readonly school_id: number;
  readonly requested_course_name: string;
};

export type AuditSchoolRequest = {
  readonly kind: "school";
  readonly school_request_id: number;
  readonly employee_education_id: number | null;
  readonly requested_by: number;
  readonly requested_school_name: string;
};

export type AuditRequest = AuditCourseRequest | AuditSchoolRequest;

export type AuditEducationCandidate = {
  readonly employee_education_id: number;
  readonly user_id: number;
  readonly school_id: number | null;
  readonly school_course_id: number | null;
  readonly school_name_raw: string | null;
  readonly course_name_raw: string | null;
  readonly education_status: string;
};

/**
 * Collapse interior whitespace, trim, and lowercase using the same
 * locale-insensitive rule the runtime binder applies to course names.
 * Blank input normalizes to the empty string, which never matches.
 */
export function normalizeAuditName(value: string): string {
  return value.replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US");
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function readLinkId(request: unknown): number | null {
  if (typeof request !== "object" || request === null) return null;
  if (!("employee_education_id" in request)) return null;
  const linkId: unknown = request.employee_education_id;
  return isPositiveInteger(linkId) ? linkId : null;
}

function isUsableCandidate(
  candidate: AuditEducationCandidate,
  ownerId: number,
): boolean {
  return (
    isPositiveInteger(candidate.employee_education_id) &&
    candidate.user_id === ownerId &&
    candidate.education_status === "Pending"
  );
}

/**
 * Keep the owned Pending educations at the request's school whose raw
 * course name, when present, matches the requested course name. A null
 * raw course name imposes no course constraint.
 */
export function filterCourseCandidates(
  request: AuditCourseRequest,
  candidates: readonly AuditEducationCandidate[],
): readonly AuditEducationCandidate[] {
  const wanted = normalizeAuditName(request.requested_course_name);
  if (!isPositiveInteger(request.requested_by)) return [];
  if (!isPositiveInteger(request.school_id)) return [];
  if (wanted === "") return [];
  return candidates.filter(
    (candidate) =>
      isUsableCandidate(candidate, request.requested_by) &&
      candidate.school_id === request.school_id &&
      (candidate.course_name_raw === null ||
        normalizeAuditName(candidate.course_name_raw) === wanted),
  );
}

/**
 * Keep the owned Pending educations with no canonical school whose raw
 * school name matches the requested school name. Rows already carrying
 * a canonical school are not legacy candidates.
 */
export function filterSchoolCandidates(
  request: AuditSchoolRequest,
  candidates: readonly AuditEducationCandidate[],
): readonly AuditEducationCandidate[] {
  const wanted = normalizeAuditName(request.requested_school_name);
  if (!isPositiveInteger(request.requested_by)) return [];
  if (wanted === "") return [];
  return candidates.filter(
    (candidate) =>
      isUsableCandidate(candidate, request.requested_by) &&
      candidate.school_id === null &&
      candidate.school_name_raw !== null &&
      normalizeAuditName(candidate.school_name_raw) === wanted,
  );
}

/**
 * Classify one request against its already-filtered candidate rows. A
 * positive link wins immediately; otherwise the candidate count decides:
 * zero is missing, exactly one is deterministic, two or more is
 * ambiguous. Malformed input classifies safely and never throws.
 */
export function classifyLegacyLink(
  request: unknown,
  candidates: readonly unknown[],
): LegacyLinkStatus {
  if (readLinkId(request) !== null) return "linked";
  if (candidates.length === 0) return "missing_candidate";
  if (candidates.length === 1) return "deterministic_candidate";
  return "ambiguous_candidate";
}
