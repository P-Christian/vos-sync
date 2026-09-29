import "server-only";

import { z, type ZodType } from "zod";

import {
  assignmentError,
  dependencyError,
  SchoolRequestSchoolAdminError,
} from "./errors";
import { schoolAssignmentRowSchema, type SchoolAssignmentRow } from "./schemas";
import type { SchoolAssignment } from "./types";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/u, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

const ASSIGNMENT_FIELDS = "school_admin_id,school_id,user_id,is_active";

async function fetchRows<T>(operation: string, path: string, schema: ZodType<T>): Promise<readonly T[]> {
  if (!DIRECTUS_BASE) throw dependencyError(`${operation}.configuration`);
  try {
    const response = await fetch(`${DIRECTUS_BASE}${path}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw dependencyError(operation, response.status);
    const body: unknown = await response.json();
    const parsed = z.object({ data: z.array(schema) }).safeParse(body);
    if (!parsed.success) throw dependencyError(`${operation}.response`);
    return parsed.data.data;
  } catch (error: unknown) {
    if (error instanceof SchoolRequestSchoolAdminError) throw error;
    throw dependencyError(operation, undefined, error);
  }
}

function isActiveRow(row: SchoolAssignmentRow): boolean {
  return row.is_active === true || row.is_active === 1;
}

/**
 * Exact-one active-assignment resolver. Fails closed BEFORE any request
 * lookup: zero active assignments and multiple active assignments both
 * throw a typed 403. Assignment selection never uses `data[0]`; exactly
 * one active row is required.
 */
export async function resolveExactSchoolAssignment(callerUserId: number): Promise<SchoolAssignment> {
  if (!Number.isInteger(callerUserId) || callerUserId <= 0) {
    throw dependencyError("assignment.resolve.input");
  }
  const query = new URLSearchParams({
    "filter[user_id][_eq]": String(callerUserId),
    "filter[is_active][_eq]": "true",
    fields: ASSIGNMENT_FIELDS,
    limit: "-1",
  });
  const rows = await fetchRows(
    "assignment.resolveExact",
    `/items/vs_school_admin?${query.toString()}`,
    schoolAssignmentRowSchema,
  );
  const active = rows.filter(isActiveRow);
  if (active.length === 0) throw assignmentError("NO_ACTIVE_ASSIGNMENT");
  if (active.length > 1) throw assignmentError("MULTIPLE_ACTIVE_ASSIGNMENTS");
  const only = active[0];
  if (only === undefined) throw dependencyError("assignment.resolveExact.response");
  return { schoolAdminId: only.school_admin_id, schoolId: only.school_id, userId: only.user_id };
}
