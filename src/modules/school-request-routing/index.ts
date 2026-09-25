import "server-only";

export { claimSchoolAttendance, normalizeRosterAcademics } from "./attendance-claim";
export { SchoolRequestRoutingError } from "./errors";
export {
  fetchEducation,
  fetchSchool,
  fetchSchoolRequest,
  listWaitingSchoolRequests,
  classifySchoolRoute,
} from "./records";
export { parseRouteAudit } from "./route-audit";
export {
  groupSchoolRequest,
  rejectSchoolRequest,
  releaseGroupedSchoolRequest,
  routeSchoolRequest,
} from "./transitions";
export type {
  AttendanceClaimInput,
  EducationRecord,
  GroupSchoolInput,
  NormalizedRosterAcademics,
  RejectSchoolRequestInput,
  RequestStatus,
  RosterAcademicsInput,
  RouteAudit,
  RouteSchoolInput,
  SchoolRequestRecord,
  SchoolRouteClassification,
  SystemReleaseInput,
  SystemReleaseOutcome,
  TransitionOutcome,
} from "./types";
