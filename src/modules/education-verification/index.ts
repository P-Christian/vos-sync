import "server-only";

export { fetchActiveCoursesForSchool } from "./catalog";
export { claimCourseRequest, finalizeCourseRequest } from "./course-request-claim";
export { ensureCourseRequest } from "./course-request-ensure";
export { reconcileLinkedEducation } from "./education";
export {
  completeAttendanceRosterCourse,
  deriveRosterClassification,
  ensureAttendanceRoster,
  fetchApprovedAttendanceEvidence,
} from "./roster";
export { VerificationPrimitiveError } from "./errors";
export {
  EDUCATION_FLOW_UNAVAILABLE_MESSAGE,
  EducationFlowUnavailableError,
  EducationVerificationModeError,
  assertCourseRequestReviewAllowed,
  assertEducationWriteAllowed,
  assertSchoolRequestReviewAllowed,
  getEducationVerificationMode,
  isAttendanceModeEnabled,
  isFrozenMode,
  shouldCreateAttendanceRequest,
} from "./attendance-flow-gate";
export type { EducationVerificationMode } from "./attendance-flow-gate";
export type {
  ClaimCourseRequestInput,
  CompleteAttendanceRosterCourseInput,
  CourseRequestConsumer,
  EnsureAttendanceRosterInput,
  EnsureCourseRequestInput,
  FinalizeCourseRequestInput,
  ReconcileLinkedEducationInput,
  RosterClassification,
} from "./types";
export type {
  ActiveSchoolCourse,
  ApprovedAttendanceEvidence,
  AttendanceRosterRecord,
  CourseRequestRecord,
  EducationRecord,
} from "./schemas";
