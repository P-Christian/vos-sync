import type {
  CourseRequestActionableRow,
  CourseRequestCandidate,
  CourseRequestFinalizingRow,
  CourseRequestInboxRow,
} from "@/modules/school-admin/hooks/useCourseRequests";

/**
 * Pure presentation/validation helpers for the privacy-limited School Admin
 * course-request inbox.
 *
 * Every helper reads ONLY the fields of the parsed inbox DTO. Nothing
 * here may introduce a new data source: the inbox renders the name-only
 * submitter label, the requested course text, the manual route audit
 * (`routedBy`/`routedAt`), the persisted finalizing lock
 * (`matchedSchoolCourseId`/`reviewedBy`), and the allowlisted Active course
 * candidates. Identity, contacts, profiles, documents, raw education, roster,
 * and school ownership are never part of any value produced here.
 */

export const INBOX_UNKNOWN = "\u2014";

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Safe date+time label for the routed timestamp. Missing/invalid input renders the placeholder. */
export function formatInboxDateTime(value: string | null | undefined): string {
  if (!hasText(value)) return INBOX_UNKNOWN;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return INBOX_UNKNOWN;
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short request reference for the DOM; the raw row id is allowlisted DTO data. */
export function requestReference(row: CourseRequestInboxRow): string {
  return `#${String(row.courseRequestId)}`;
}

/** Manual route audit label: who routed the request and when. */
export function formatRouteAudit(row: CourseRequestInboxRow): string {
  return `Routed by #${String(row.routedBy)} on ${formatInboxDateTime(row.routedAt)}`;
}

/** Human label for one Active course candidate. Reads only the five DTO fields. */
export function describeCandidate(candidate: CourseRequestCandidate): string {
  const code = hasText(candidate.courseCode) ? ` (${candidate.courseCode})` : "";
  const degree = hasText(candidate.degree) ? ` - ${candidate.degree}` : "";
  return `${candidate.courseName}${code}${degree}`;
}

export interface CourseCandidateOption {
  readonly value: string;
  readonly label: string;
}

/**
 * SearchableSelect option list. Values are stringified `schoolCourseId`s; the
 * label stays within the allowlisted candidate fields.
 */
export function candidateOptions(
  courses: readonly CourseRequestCandidate[],
): CourseCandidateOption[] {
  return courses.map((candidate) => ({
    value: String(candidate.schoolCourseId),
    label: describeCandidate(candidate),
  }));
}

export function findCandidateById(
  courses: readonly CourseRequestCandidate[],
  courseId: number,
): CourseRequestCandidate | undefined {
  return courses.find((candidate) => candidate.schoolCourseId === courseId);
}

export interface LockedCourseDisplay {
  readonly label: string;
  readonly code: string | null;
  readonly resolved: boolean;
}

/**
 * Persisted locked-course display for a finalizing row. The lock id is always
 * allowlisted DTO data; when the candidate is no longer Active (or absent from
 * the current candidate list) only the id is shown - a name is never guessed.
 */
export function describeLockedCourse(
  row: CourseRequestFinalizingRow,
  courses: readonly CourseRequestCandidate[],
): LockedCourseDisplay {
  const candidate = findCandidateById(courses, row.matchedSchoolCourseId);
  if (candidate === undefined) {
    return { label: `Course #${String(row.matchedSchoolCourseId)}`, code: null, resolved: false };
  }
  return {
    label: candidate.courseName,
    code: hasText(candidate.courseCode) ? candidate.courseCode : null,
    resolved: true,
  };
}

/** Finalizing lock sentence: persisted course plus the ORIGINAL reviewer. */
export function describeFinalizingLock(
  row: CourseRequestFinalizingRow,
  courses: readonly CourseRequestCandidate[],
): string {
  const locked = describeLockedCourse(row, courses);
  return `Locked to ${locked.label}; original reviewer #${String(row.reviewedBy)}.`;
}

/** True when the row is an unclaimed actionable decision. */
export function isActionableRow(row: CourseRequestInboxRow): row is CourseRequestActionableRow {
  return row.matchedSchoolCourseId === null && row.reviewedBy === null;
}

/** True when the row carries the persisted finalizing lock. */
export function isFinalizingRow(row: CourseRequestInboxRow): row is CourseRequestFinalizingRow {
  return row.matchedSchoolCourseId !== null && row.reviewedBy !== null;
}

/**
 * Client-side mirror of the server's trimmed-nonblank remark rule. Whitespace
 * only input is blocked before any network call; the server remains
 * authoritative for every decision.
 */
export function validateRejectRemarks(remarks: string): string | null {
  if (remarks.trim().length === 0) {
    return "A rejection reason is required.";
  }
  return null;
}

/** Approve is impossible without a positive selected candidate id. */
export function isApproveReachable(selectedCourseId: number | null): boolean {
  return selectedCourseId !== null && Number.isInteger(selectedCourseId) && selectedCourseId > 0;
}

export type InboxLoadFailureKind = "forbidden" | "unauthenticated" | "dependency" | "unknown";

/**
 * Classify a load failure into the state the page must render.
 *
 * The typed hook surfaces the HTTP boundary message (the status itself is not
 * re-exposed, so the sanitized envelope text is the contract here):
 *  - 403 -> "This administrator is not authorized for this school."
 *  - 401 -> "Authentication is required."
 *  - 503 -> "Service temporarily unavailable."
 * Anything else is an unknown dependency failure and renders the recoverable
 * error banner, never an empty/success state.
 */
export function classifyInboxLoadFailure(message: string): InboxLoadFailureKind {
  const lower = message.toLowerCase();
  if (lower.includes("not authorized") || lower.includes("forbidden")) return "forbidden";
  if (lower.includes("authentication") || lower.includes("unauthorized")) return "unauthenticated";
  if (lower.includes("temporarily unavailable")) return "dependency";
  return "unknown";
}
