import "server-only";

import { getPHTimeString } from "@/lib/utils";
import { patchRows } from "./directus";
import { routingError } from "./errors";
import {
  classifySchoolRoute,
  fetchEducation,
  fetchSchoolRequest,
  SCHOOL_REQUEST_FIELDS,
} from "./records";
import { parseRouteAudit } from "./route-audit";
import { schoolRequestSchema } from "./schemas";
import type {
  EducationRecord,
  GroupSchoolInput,
  RejectSchoolRequestInput,
  RouteSchoolInput,
  SchoolRequestRecord,
  SystemReleaseInput,
  SystemReleaseOutcome,
  TransitionOutcome,
} from "./types";
import { normalizeSchoolIdentity } from "@/modules/education-verification/validation";

function hasNoAuditOrRemarks(request: SchoolRequestRecord): boolean {
  return (
    request.matched_school_id === null &&
    request.routed_by === null &&
    request.routed_at === null &&
    request.reviewed_by === null &&
    request.reviewed_at === null &&
    request.admin_remarks === null
  );
}

function requireEducationLink(request: SchoolRequestRecord): number {
  if (
    request.employee_education_id === null ||
    request.active_employee_education_id !== request.employee_education_id
  ) {
    throw routingError("CORRELATION_CONFLICT", "The active and historical education links do not agree.");
  }
  return request.employee_education_id;
}

function assertPendingEducation(education: EducationRecord, request: SchoolRequestRecord, targetSchoolId: number): void {
  if (education.user_id !== request.requested_by || education.education_status !== "Pending") {
    throw routingError("CORRELATION_CONFLICT", "The linked education no longer belongs to this Pending request.");
  }
  if (education.school_id === targetSchoolId) return;
  if (
    education.school_id === null &&
    education.school_name_raw !== null &&
    normalizeSchoolIdentity(education.school_name_raw) === normalizeSchoolIdentity(request.requested_school_name)
  ) {
    return;
  }
  throw routingError("CORRELATION_CONFLICT", "The linked education identity contradicts the target school.");
}

function routeReplay(request: SchoolRequestRecord, input: RouteSchoolInput): boolean {
  if (
    request.request_status !== "RoutedToSchool" ||
    request.matched_school_id !== input.targetSchoolId ||
    request.routed_by !== input.actorId ||
    request.reviewed_by !== null ||
    request.reviewed_at !== null ||
    request.admin_remarks !== null
  ) {
    return false;
  }
  parseRouteAudit(request);
  return true;
}

function groupReplay(request: SchoolRequestRecord, input: GroupSchoolInput): boolean {
  return (
    request.request_status === "Pending" &&
    request.matched_school_id === input.targetSchoolId &&
    request.routed_by === null &&
    request.routed_at === null &&
    request.reviewed_by === null &&
    request.reviewed_at === null &&
    request.admin_remarks === null
  );
}

async function patchRequest(
  operation: string,
  filter: Readonly<Record<string, unknown>>,
  data: Readonly<Record<string, unknown>>
): Promise<SchoolRequestRecord | null> {
  return patchRows(
    {
      operation,
      collection: "vs_school_request",
      filter,
      data,
      fields: SCHOOL_REQUEST_FIELDS,
    },
    schoolRequestSchema
  );
}

export async function routeSchoolRequest(input: RouteSchoolInput): Promise<TransitionOutcome> {
  const request = await fetchSchoolRequest(input.requestId);
  if (routeReplay(request, input)) return { kind: "converged", request };
  if (request.request_status !== "Pending" || !hasNoAuditOrRemarks(request)) {
    throw routingError("STALE_CONFLICT", "The school request is no longer routable.");
  }
  const educationId = requireEducationLink(request);
  const [classification, education] = await Promise.all([
    classifySchoolRoute(input.targetSchoolId),
    fetchEducation(educationId),
  ]);
  if (classification !== "DIRECT_REVIEW") {
    throw routingError("TARGET_INELIGIBLE", "The target school is not a review-ready Verified and Active school.");
  }
  assertPendingEducation(education, request, input.targetSchoolId);
  const updated = await patchRequest(
    "schoolRequest.route",
    {
      school_request_id: { _eq: input.requestId },
      request_status: { _eq: "Pending" },
      matched_school_id: { _null: true },
      routed_by: { _null: true },
      routed_at: { _null: true },
      reviewed_by: { _null: true },
      reviewed_at: { _null: true },
      admin_remarks: { _null: true },
      employee_education_id: { _eq: educationId },
      active_employee_education_id: { _eq: educationId },
    },
    {
      matched_school_id: input.targetSchoolId,
      routed_by: input.actorId,
      routed_at: getPHTimeString(),
      request_status: "RoutedToSchool",
    }
  );
  if (updated) return { kind: "mutated", request: updated };
  const current = await fetchSchoolRequest(input.requestId);
  if (routeReplay(current, input)) return { kind: "converged", request: current };
  throw routingError("STALE_CONFLICT", "The school request changed before routing completed.");
}

export async function groupSchoolRequest(input: GroupSchoolInput): Promise<TransitionOutcome> {
  const request = await fetchSchoolRequest(input.requestId);
  if (groupReplay(request, input)) return { kind: "converged", request };
  if (
    request.request_status !== "Pending" ||
    request.matched_school_id !== null ||
    request.routed_by !== null ||
    request.routed_at !== null ||
    request.reviewed_by !== null ||
    request.reviewed_at !== null ||
    request.admin_remarks !== null
  ) {
    throw routingError("STALE_CONFLICT", "The school request is no longer groupable.");
  }
  const educationId = requireEducationLink(request);
  const [classification, education] = await Promise.all([
    classifySchoolRoute(input.targetSchoolId),
    fetchEducation(educationId),
  ]);
  if (classification !== "AWAITING_ACTIVATION" && classification !== "AWAITING_REGISTRATION") {
    throw routingError("TARGET_INELIGIBLE", "The target school is not a server-classified waiting school.");
  }
  assertPendingEducation(education, request, input.targetSchoolId);
  const updated = await patchRequest(
    "schoolRequest.group",
    {
      school_request_id: { _eq: input.requestId },
      request_status: { _eq: "Pending" },
      matched_school_id: { _null: true },
      routed_by: { _null: true },
      routed_at: { _null: true },
      reviewed_by: { _null: true },
      reviewed_at: { _null: true },
      admin_remarks: { _null: true },
      employee_education_id: { _eq: educationId },
      active_employee_education_id: { _eq: educationId },
    },
    { matched_school_id: input.targetSchoolId, request_status: "Pending" }
  );
  if (updated) return { kind: "mutated", request: updated };
  const current = await fetchSchoolRequest(input.requestId);
  if (groupReplay(current, input)) return { kind: "converged", request: current };
  throw routingError("STALE_CONFLICT", "The school request changed before grouping completed.");
}

function systemReplay(request: SchoolRequestRecord, targetSchoolId: number): boolean {
  if (
    request.request_status !== "RoutedToSchool" ||
    request.matched_school_id !== targetSchoolId ||
    request.reviewed_by !== null ||
    request.reviewed_at !== null
  ) {
    return false;
  }
  const audit = parseRouteAudit(request);
  return audit.kind === "system" && audit.matched_school_id === targetSchoolId;
}

function skippedRelease(request: SchoolRequestRecord, targetSchoolId: number): SystemReleaseOutcome {
  if (request.request_status !== "Pending") {
    return { kind: "skipped", reason: "terminal", request };
  }
  if (request.matched_school_id !== targetSchoolId) {
    return { kind: "skipped", reason: "retargeted", request };
  }
  if (request.reviewed_by !== null || request.reviewed_at !== null) {
    return { kind: "skipped", reason: "already-claimed", request };
  }
  return { kind: "skipped", reason: "concurrent-change", request };
}

export async function releaseGroupedSchoolRequest(input: SystemReleaseInput): Promise<SystemReleaseOutcome> {
  const request = await fetchSchoolRequest(input.requestId);
  if (systemReplay(request, input.targetSchoolId)) return { kind: "converged", request };
  if (request.request_status === "RoutedToSchool") return skippedRelease(request, input.targetSchoolId);
  if (request.request_status !== "Pending" || request.matched_school_id !== input.targetSchoolId) {
    return skippedRelease(request, input.targetSchoolId);
  }
  if (
    request.routed_by !== null ||
    request.routed_at !== null ||
    request.reviewed_by !== null ||
    request.reviewed_at !== null ||
    request.admin_remarks !== null
  ) {
    return skippedRelease(request, input.targetSchoolId);
  }
  const classification = await classifySchoolRoute(input.targetSchoolId);
  if (classification !== "DIRECT_REVIEW") {
    return { kind: "skipped", reason: "ineligible-school", request };
  }
  const updated = await patchRequest(
    "schoolRequest.systemRelease",
    {
      school_request_id: { _eq: input.requestId },
      request_status: { _eq: "Pending" },
      matched_school_id: { _eq: input.targetSchoolId },
      routed_by: { _null: true },
      routed_at: { _null: true },
      reviewed_by: { _null: true },
      reviewed_at: { _null: true },
      admin_remarks: { _null: true },
    },
    { matched_school_id: input.targetSchoolId, routed_by: null, routed_at: getPHTimeString(), request_status: "RoutedToSchool" }
  );
  if (updated) return { kind: "mutated", request: updated };
  const current = await fetchSchoolRequest(input.requestId);
  if (systemReplay(current, input.targetSchoolId)) return { kind: "converged", request: current };
  return skippedRelease(current, input.targetSchoolId);
}

function rejectReplay(request: SchoolRequestRecord, input: RejectSchoolRequestInput): boolean {
  return (
    request.request_status === "Rejected" &&
    request.admin_remarks === input.remarks.trim() &&
    request.reviewed_by === input.actorId &&
    request.reviewed_at !== null &&
    request.active_employee_education_id === null &&
    request.routed_by === null &&
    request.routed_at === null
  );
}

export async function rejectSchoolRequest(input: RejectSchoolRequestInput): Promise<TransitionOutcome> {
  const remarks = input.remarks.trim();
  if (remarks.length === 0) throw routingError("INVALID_INPUT", "Rejection remarks must not be blank.");
  const request = await fetchSchoolRequest(input.requestId);
  const normalizedInput = { ...input, remarks };
  if (rejectReplay(request, normalizedInput)) return { kind: "converged", request };
  if (
    request.request_status !== "Pending" ||
    request.routed_by !== null ||
    request.routed_at !== null ||
    request.reviewed_by !== null ||
    request.reviewed_at !== null ||
    request.admin_remarks !== null
  ) {
    throw routingError("STALE_CONFLICT", "The school request is no longer rejectable.");
  }
  const updated = await patchRequest(
    "schoolRequest.reject",
    {
      school_request_id: { _eq: input.requestId },
      request_status: { _eq: "Pending" },
      routed_by: { _null: true },
      routed_at: { _null: true },
      reviewed_by: { _null: true },
      reviewed_at: { _null: true },
      admin_remarks: { _null: true },
    },
    {
      request_status: "Rejected",
      admin_remarks: remarks,
      reviewed_by: input.actorId,
      reviewed_at: getPHTimeString(),
      active_employee_education_id: null,
    }
  );
  if (updated) return { kind: "mutated", request: updated };
  const current = await fetchSchoolRequest(input.requestId);
  if (rejectReplay(current, normalizedInput)) return { kind: "converged", request: current };
  throw routingError("STALE_CONFLICT", "The school request changed before rejection completed.");
}
