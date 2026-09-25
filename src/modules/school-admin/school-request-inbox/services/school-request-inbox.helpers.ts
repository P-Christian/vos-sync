import type {
  SchoolAttendanceAcademics,
  SchoolInboxRow,
} from "@/modules/school-admin/hooks/useSchoolRequests";

/**
 * Pure presentation/validation helpers for the privacy-limited School Admin
 * attendance inbox.
 *
 * Every helper reads ONLY the fields of the parsed inbox DTO. Nothing here
 * may introduce a new data source: the inbox renders submitter display name,
 * requested/canonical school, canonical course, education dates, and the
 * submitted/routed/reviewer timestamps. Identity, alumni, contacts,
 * documents, and course/identity overrides are never part of any value
 * produced here.
 */

export const INBOX_UNKNOWN = "\u2014";

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Safe date-only label. Missing/invalid input renders the placeholder. */
export function formatInboxDate(value: string | null | undefined): string {
  if (!hasText(value)) return INBOX_UNKNOWN;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return INBOX_UNKNOWN;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Safe date+time label for submitted/routed/reviewer timestamps. */
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

/** Education attendance window. A missing end date is an open/current record. */
export function formatEducationRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  const start = formatInboxDate(startDate);
  if (!hasText(endDate)) {
    return `${start} to Present`;
  }
  return `${start} to ${formatInboxDate(endDate)}`;
}

export interface CourseDisplay {
  /** Canonical course label, or the unresolved-course label. */
  readonly label: string;
  readonly code: string | null;
  readonly resolved: boolean;
}

/**
 * Canonical course display. The frozen DTO exposes only the canonical course;
 * an unresolved course means the follow-on course workflow owns it, so no
 * course name is ever guessed or invented here.
 */
export function describeCanonicalCourse(row: SchoolInboxRow): CourseDisplay {
  if (row.course === null) {
    return { label: "No canonical course linked", code: null, resolved: false };
  }
  return {
    label: row.course.courseName,
    code: hasText(row.course.courseCode) ? row.course.courseCode : null,
    resolved: true,
  };
}

/** Canonical (routed) school label. Only the persisted id is exposed. */
export function formatCanonicalSchool(row: SchoolInboxRow): string {
  return `School #${String(row.matchedSchoolId)}`;
}

/** Reported school name persisted on the linked education row (raw value). */
export function formatReportedSchool(row: SchoolInboxRow): string {
  return hasText(row.education.schoolNameRaw) ? row.education.schoolNameRaw : INBOX_UNKNOWN;
}

/**
 * Defense in depth: only rows whose PERSISTED `matchedSchoolId` equals the
 * inbox's own school may render. A foreign-school row is dropped before any
 * cell is built, so no cross-school data can appear in the DOM even if the
 * boundary were ever widened by mistake.
 */
export function visibleInboxRows(
  rows: readonly SchoolInboxRow[],
  schoolId: number,
): readonly SchoolInboxRow[] {
  return rows.filter((row) => row.matchedSchoolId === schoolId);
}

/** Reviewer/time claim label for claimed and Finalizing rows. */
export function describePersistedClaim(row: SchoolInboxRow): string | null {
  if (row.reviewedBy === null || !hasText(row.reviewedAt)) return null;
  return `Reviewer #${String(row.reviewedBy)} - ${formatInboxDateTime(row.reviewedAt)}`;
}

export type ApprovalOutcomeVariant = "completesNow" | "followOn";

export interface ApprovalOutcomeCopy {
  readonly variant: ApprovalOutcomeVariant;
  readonly title: string;
  readonly body: string;
}

/**
 * Mirrors the server's two approval branches exactly:
 *  - canonical course present -> roster + education Verified, no follow-on.
 *  - course unresolved        -> partial roster, education stays Pending, and
 *    exactly one follow-on course request is created.
 */
export function describeApprovalOutcome(row: SchoolInboxRow): ApprovalOutcomeCopy {
  if (row.course === null) {
    return {
      variant: "followOn",
      title: "Creates exactly one follow-on course request",
      body:
        "No canonical course is linked to this education. Approving records the attendance " +
        "roster entry, keeps the education Pending, and creates exactly one follow-on course " +
        "request for the course workflow.",
    };
  }
  return {
    variant: "completesNow",
    title: "Completes this education now",
    body:
      `The canonical course "${row.course.courseName}" is already linked. Approving records the ` +
      "attendance roster entry, marks the education Verified, and creates no follow-on course request.",
  };
}

export interface AcademicsInput {
  readonly studentNumber: string;
  readonly gpa: string;
  readonly schoolYear: string;
}

export interface AcademicsValidation {
  readonly academics: SchoolAttendanceAcademics;
  readonly error: string | null;
}

const STUDENT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\- ]*$/u;
const SCHOOL_YEAR_PATTERN = /^\d{4}$/u;

/**
 * Client-side mirror of the server's optional-academics validation so
 * malformed input is blocked before any network call. GPA must be numeric
 * within 0..5, school year a four-digit year, and the student number a safe
 * identifier. Blank inputs are omitted entirely (never sent as "").
 */
export function validateAcademicsInput(input: AcademicsInput): AcademicsValidation {
  const studentNumber = input.studentNumber.trim();
  const gpaText = input.gpa.trim();
  const schoolYear = input.schoolYear.trim();

  if (studentNumber.length > 0 && !STUDENT_NUMBER_PATTERN.test(studentNumber)) {
    return {
      academics: {},
      error: "Student number may contain letters, numbers, spaces and hyphens only.",
    };
  }
  if (gpaText.length > 0) {
    const gpa = Number(gpaText);
    if (!Number.isFinite(gpa) || gpa < 0 || gpa > 5) {
      return { academics: {}, error: "GPA must be between 0 and 5." };
    }
  }
  if (schoolYear.length > 0 && !SCHOOL_YEAR_PATTERN.test(schoolYear)) {
    return { academics: {}, error: "School year must be a four-digit year." };
  }

  return {
    academics: {
      ...(studentNumber.length > 0 ? { student_number: studentNumber } : {}),
      ...(gpaText.length > 0 ? { gpa: Number(gpaText) } : {}),
      ...(schoolYear.length > 0 ? { school_year: schoolYear } : {}),
    },
    error: null,
  };
}

export type InboxLoadFailureKind = "forbidden" | "unauthenticated" | "dependency" | "unknown";

/**
 * Classify a load error message from the HTTP boundary into the state the
 * page must render. The API maps 403 to "Forbidden ...", 401 to
 * "Unauthorized", and 503 to the sanitized dependency message.
 */
export function classifyInboxLoadError(message: string): InboxLoadFailureKind {
  const lower = message.toLowerCase();
  if (lower.includes("forbidden")) return "forbidden";
  if (lower.includes("unauthorized")) return "unauthenticated";
  if (lower.includes("temporarily unavailable")) return "dependency";
  return "unknown";
}
