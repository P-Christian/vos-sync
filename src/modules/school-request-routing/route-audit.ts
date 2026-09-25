import "server-only";

import { routingError } from "./errors";
import type { RouteAudit } from "./types";

export type RouteAuditInput = {
  readonly routed_by: number | null;
  readonly routed_at: string | null;
  readonly matched_school_id: number | null;
};

function validId(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value > 0;
}

function validTimestamp(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

export function parseRouteAudit(input: RouteAuditInput): RouteAudit {
  if (validId(input.routed_by) && validTimestamp(input.routed_at)) {
    return {
      kind: "manual",
      routed_by: input.routed_by,
      routed_at: input.routed_at,
    };
  }
  if (input.routed_by === null && validTimestamp(input.routed_at) && validId(input.matched_school_id)) {
    return {
      kind: "system",
      routed_by: null,
      routed_at: input.routed_at,
      matched_school_id: input.matched_school_id,
    };
  }
  throw routingError("INVALID_ROUTE_AUDIT", "The persisted route audit is incomplete or contradictory.");
}
