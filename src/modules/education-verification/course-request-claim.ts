import "server-only";

import { patchRows } from "./directus";
import { primitiveError } from "./errors";
import {
  COURSE_REQUEST_FIELDS,
  fetchCourseRequestExact,
} from "./course-request-records";
import {
  courseRequestSchema,
  type CourseRequestRecord,
} from "./schemas";
import type {
  ClaimCourseRequestInput,
  CourseRequestConsumer,
  FinalizeCourseRequestInput,
} from "./types";
import { assertNever, requireNonBlank, requirePositiveInteger } from "./validation";

function sourceStatus(consumer: CourseRequestConsumer) {
  return consumer === "vos" ? "Pending" as const : "RoutedToSchool" as const;
}

function requireRouteAudit(
  request: CourseRequestRecord,
  consumer: CourseRequestConsumer
): void {
  if (
    consumer === "school" &&
    request.request_status === "RoutedToSchool" &&
    (request.routed_by === null || request.routed_at === null)
  ) {
    throw primitiveError(
      "INVALID_ROUTE_AUDIT",
      "School course decisions require a complete manual route audit."
    );
  }
}

function sourceGuard(consumer: CourseRequestConsumer) {
  return consumer === "vos"
    ? {
        request_status: { _eq: "Pending" },
        routed_by: { _null: true },
        routed_at: { _null: true },
      }
    : {
        request_status: { _eq: "RoutedToSchool" },
        routed_by: { _nnull: true },
        routed_at: { _nnull: true },
      };
}

function isExactClaim(
  request: CourseRequestRecord,
  consumer: CourseRequestConsumer,
  courseId: number
): boolean {
  return (
    request.request_status === sourceStatus(consumer) &&
    request.matched_school_course_id === courseId &&
    request.reviewed_by !== null &&
    request.reviewed_at === null
  );
}

export async function claimCourseRequest(
  input: ClaimCourseRequestInput
): Promise<CourseRequestRecord> {
  const requestId = requirePositiveInteger(input.requestId, "requestId");
  const reviewerId = requirePositiveInteger(input.reviewerId, "reviewerId");
  const courseId = requirePositiveInteger(input.courseId, "courseId");
  const current = await fetchCourseRequestExact(requestId);
  requireRouteAudit(current, input.consumer);
  if (isExactClaim(current, input.consumer, courseId)) return current;
  if (
    current.request_status !== sourceStatus(input.consumer) ||
    current.matched_school_course_id !== null ||
    current.reviewed_by !== null ||
    current.reviewed_at !== null
  ) {
    throw primitiveError("CLAIM_CONFLICT", "The course request cannot accept this claim.");
  }
  const updated = await patchRows(
    {
      operation: "courseRequest.claim",
      collection: "vs_course_request",
      filter: {
        course_request_id: { _eq: requestId },
        ...sourceGuard(input.consumer),
        matched_school_course_id: { _null: true },
        reviewed_by: { _null: true },
        reviewed_at: { _null: true },
      },
      data: {
        matched_school_course_id: courseId,
        reviewed_by: reviewerId,
      },
      fields: COURSE_REQUEST_FIELDS,
    },
    courseRequestSchema
  );
  if (updated) return updated;
  const readBack = await fetchCourseRequestExact(requestId);
  requireRouteAudit(readBack, input.consumer);
  if (isExactClaim(readBack, input.consumer, courseId)) return readBack;
  throw primitiveError("CLAIM_CONFLICT", "Another course request claim won.");
}

function philippineTimestamp(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

async function finalizeApproval(
  input: Extract<FinalizeCourseRequestInput, { readonly action: "Approved" }>
): Promise<CourseRequestRecord> {
  const current = await fetchCourseRequestExact(input.requestId);
  requireRouteAudit(current, input.consumer);
  if (
    current.request_status === "Approved" &&
    current.matched_school_course_id === input.courseId &&
    current.reviewed_by !== null &&
    current.reviewed_at !== null
  ) {
    return current;
  }
  if (!isExactClaim(current, input.consumer, input.courseId)) {
    throw primitiveError("CLAIM_CONFLICT", "Approval does not match the persisted claim.");
  }
  const updated = await patchRows(
    {
      operation: "courseRequest.finalizeApproval",
      collection: "vs_course_request",
      filter: {
        course_request_id: { _eq: input.requestId },
        ...sourceGuard(input.consumer),
        matched_school_course_id: { _eq: input.courseId },
        reviewed_by: { _nnull: true },
        reviewed_at: { _null: true },
      },
      data: { request_status: "Approved", reviewed_at: philippineTimestamp() },
      fields: COURSE_REQUEST_FIELDS,
    },
    courseRequestSchema
  );
  if (updated) return updated;
  const readBack = await fetchCourseRequestExact(input.requestId);
  if (
    readBack.request_status === "Approved" &&
    readBack.matched_school_course_id === input.courseId &&
    readBack.reviewed_at !== null
  ) return readBack;
  throw primitiveError("CLAIM_CONFLICT", "Approval finalization lost its source-state guard.");
}

async function finalizeRejection(
  input: Extract<FinalizeCourseRequestInput, { readonly action: "Rejected" }>
): Promise<CourseRequestRecord> {
  const current = await fetchCourseRequestExact(input.requestId);
  requireRouteAudit(current, input.consumer);
  if (current.request_status === "Rejected" && current.reviewed_by === input.reviewerId) {
    return current;
  }
  if (
    current.request_status !== sourceStatus(input.consumer) ||
    current.matched_school_course_id !== null ||
    current.reviewed_by !== null ||
    current.reviewed_at !== null
  ) throw primitiveError("CLAIM_CONFLICT", "The rejection conflicts with persisted state.");
  const updated = await patchRows(
    {
      operation: "courseRequest.finalizeRejection",
      collection: "vs_course_request",
      filter: {
        course_request_id: { _eq: input.requestId },
        ...sourceGuard(input.consumer),
        matched_school_course_id: { _null: true },
        reviewed_by: { _null: true },
        reviewed_at: { _null: true },
      },
      data: {
        request_status: "Rejected",
        reviewed_by: input.reviewerId,
        reviewed_at: philippineTimestamp(),
        admin_remarks: requireNonBlank(input.remarks, "remarks"),
      },
      fields: COURSE_REQUEST_FIELDS,
    },
    courseRequestSchema
  );
  if (updated) return updated;
  const readBack = await fetchCourseRequestExact(input.requestId);
  if (readBack.request_status === "Rejected" && readBack.reviewed_by === input.reviewerId) return readBack;
  throw primitiveError("CLAIM_CONFLICT", "Rejection finalization lost its source-state guard.");
}

async function finalizeRoute(
  input: Extract<FinalizeCourseRequestInput, { readonly action: "RoutedToSchool" }>
): Promise<CourseRequestRecord> {
  const current = await fetchCourseRequestExact(input.requestId);
  if (
    current.request_status === "RoutedToSchool" &&
    current.routed_by === input.reviewerId &&
    current.routed_at !== null
  ) return current;
  if (
    current.request_status !== "Pending" ||
    current.matched_school_course_id !== null ||
    current.reviewed_by !== null ||
    current.reviewed_at !== null ||
    current.routed_by !== null ||
    current.routed_at !== null
  ) throw primitiveError("CLAIM_CONFLICT", "The route conflicts with persisted state.");
  const updated = await patchRows(
    {
      operation: "courseRequest.finalizeRoute",
      collection: "vs_course_request",
      filter: {
        course_request_id: { _eq: input.requestId },
        ...sourceGuard("vos"),
        matched_school_course_id: { _null: true },
        reviewed_by: { _null: true },
        reviewed_at: { _null: true },
      },
      data: {
        request_status: "RoutedToSchool",
        routed_by: input.reviewerId,
        routed_at: philippineTimestamp(),
      },
      fields: COURSE_REQUEST_FIELDS,
    },
    courseRequestSchema
  );
  if (updated) return updated;
  const readBack = await fetchCourseRequestExact(input.requestId);
  if (readBack.request_status === "RoutedToSchool" && readBack.routed_by === input.reviewerId && readBack.routed_at !== null) return readBack;
  throw primitiveError("CLAIM_CONFLICT", "Routing lost its source-state guard.");
}

export function finalizeCourseRequest(
  input: FinalizeCourseRequestInput
): Promise<CourseRequestRecord> {
  requirePositiveInteger(input.requestId, "requestId");
  switch (input.action) {
    case "Approved":
      requirePositiveInteger(input.courseId, "courseId");
      return finalizeApproval(input);
    case "Rejected":
      requirePositiveInteger(input.reviewerId, "reviewerId");
      return finalizeRejection(input);
    case "RoutedToSchool":
      requirePositiveInteger(input.reviewerId, "reviewerId");
      return finalizeRoute(input);
    default:
      return assertNever(input);
  }
}
