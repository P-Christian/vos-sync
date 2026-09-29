import "server-only";

import { z, type ZodType } from "zod";
import { routingError, SchoolRequestRoutingError } from "./errors";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || ""
).replace(/\/$/u, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export type DirectusPatch = {
  readonly operation: string;
  readonly collection: string;
  readonly filter: Readonly<Record<string, unknown>>;
  readonly data: Readonly<Record<string, unknown>>;
  readonly fields: string;
};

export function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

export async function request(operation: string, path: string, init?: RequestInit): Promise<Response> {
  if (!DIRECTUS_BASE) throw routingError("DEPENDENCY_FAILURE", `${operation} is not configured.`);
  try {
    const response = await fetch(`${DIRECTUS_BASE}${path}`, {
      ...init,
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw routingError("DEPENDENCY_FAILURE", `${operation} failed.`);
    return response;
  } catch (error: unknown) {
    if (error instanceof SchoolRequestRoutingError) throw error;
    throw new SchoolRequestRoutingError("DEPENDENCY_FAILURE", `${operation} failed.`, 502, {
      cause: error,
    });
  }
}

export async function responseJson(operation: string, response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    throw new SchoolRequestRoutingError("DEPENDENCY_FAILURE", `${operation} returned invalid JSON.`, 502, {
      cause: error,
    });
  }
}

export async function fetchRows<T>(
  operation: string,
  path: string,
  schema: ZodType<T>
): Promise<readonly T[]> {
  const body = await responseJson(operation, await request(operation, path));
  const parsed = z.object({ data: z.array(schema) }).safeParse(body);
  if (!parsed.success) throw routingError("DEPENDENCY_FAILURE", `${operation} returned invalid rows.`);
  return parsed.data.data;
}

function isFilterCondition(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function preflightSearchParams(
  filter: Readonly<Record<string, unknown>>,
  fields: string
): string {
  const query = new URLSearchParams({ fields, limit: "2" });
  for (const [field, condition] of Object.entries(filter)) {
    if (!isFilterCondition(condition)) continue;
    for (const [operator, value] of Object.entries(condition)) {
      if (operator === "_eq") query.set(`filter[${field}][_eq]`, String(value));
      if (operator === "_null" || operator === "_nnull") {
        query.set(`filter[${field}][${operator}]`, "true");
      }
    }
  }
  return query.toString();
}

function assertSchoolRequestPrimaryKey(filter: Readonly<Record<string, unknown>>): void {
  const condition = filter.school_request_id;
  if (!isFilterCondition(condition) || condition._eq === undefined) {
    throw routingError("INVALID_INPUT", "Every school-request patch must guard school_request_id.");
  }
}

export async function patchRows<T>(patch: DirectusPatch, schema: ZodType<T>): Promise<T | null> {
  assertSchoolRequestPrimaryKey(patch.filter);
  const preflightBody = await responseJson(
    patch.operation,
    await request(
      patch.operation,
      `/items/${patch.collection}?${preflightSearchParams(patch.filter, patch.fields)}`
    )
  );
  const cardinality = z.object({ data: z.array(schema) }).safeParse(preflightBody);
  if (!cardinality.success) throw routingError("DEPENDENCY_FAILURE", `${patch.operation} returned invalid rows.`);
  if (cardinality.data.data.length === 0) return null;
  if (cardinality.data.data.length > 1) {
    throw routingError("DEPENDENCY_FAILURE", `${patch.operation} matched multiple rows.`);
  }

  const query = new URLSearchParams({ fields: patch.fields });
  const response = await request(
    patch.operation,
    `/items/${patch.collection}?${query.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify({ data: patch.data, query: { filter: patch.filter } }),
    }
  );
  const body = await responseJson(patch.operation, response);
  const parsed = z.object({ data: z.array(schema).max(1) }).safeParse(body);
  if (!parsed.success) throw routingError("DEPENDENCY_FAILURE", `${patch.operation} returned invalid rows.`);
  return parsed.data.data[0] ?? null;
}
