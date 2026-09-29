import "server-only";

import { z, type ZodType } from "zod";
import { VerificationPrimitiveError } from "./errors";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/u, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export type DirectusPatch = {
  readonly operation: string;
  readonly collection: string;
  readonly filter: Readonly<Record<string, unknown>>;
  readonly data: Readonly<Record<string, unknown>>;
  readonly fields: string;
};

function dependencyFailure(
  operation: string,
  status?: number,
  cause?: unknown
): VerificationPrimitiveError {
  return new VerificationPrimitiveError(
    "DEPENDENCY_FAILURE",
    `Education verification storage failed during ${operation}.`,
    status,
    { cause }
  );
}

function headers(): Record<string, string> {
  const value: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (DIRECTUS_TOKEN) value.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return value;
}

async function request(operation: string, path: string, init?: RequestInit) {
  if (!DIRECTUS_BASE) throw dependencyFailure(`${operation}.configuration`);
  try {
    const response = await fetch(`${DIRECTUS_BASE}${path}`, {
      ...init,
      headers: headers(),
      cache: "no-store",
    });
    if (!response.ok) throw dependencyFailure(operation, response.status);
    return response;
  } catch (error: unknown) {
    if (error instanceof VerificationPrimitiveError) throw error;
    throw dependencyFailure(operation, undefined, error);
  }
}

async function responseJson(
  operation: string,
  response: Response
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    throw dependencyFailure(`${operation}.response`, response.status, error);
  }
}

export async function fetchRows<T>(
  operation: string,
  path: string,
  schema: ZodType<T>
): Promise<readonly T[]> {
  const response = await request(operation, path);
  const body = await responseJson(operation, response);
  const parsed = z.object({ data: z.array(schema) }).safeParse(body);
  if (!parsed.success) throw dependencyFailure(`${operation}.response`);
  return parsed.data.data;
}

export async function createRow<T>(
  operation: string,
  collection: string,
  data: Readonly<Record<string, unknown>>,
  fields: string,
  schema: ZodType<T>
): Promise<T> {
  const query = new URLSearchParams({ fields });
  const response = await request(
    operation,
    `/items/${collection}?${query.toString()}`,
    { method: "POST", body: JSON.stringify(data) }
  );
  const body = await responseJson(operation, response);
  const parsed = z.object({ data: schema }).safeParse(body);
  if (!parsed.success) throw dependencyFailure(`${operation}.response`);
  return parsed.data.data;
}

function isFilterCondition(
  value: unknown
): value is Readonly<Record<string, unknown>> {
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
      if (operator === "_eq") {
        query.set(`filter[${field}][_eq]`, String(value));
      } else if (operator === "_null" || operator === "_nnull") {
        query.set(`filter[${field}][${operator}]`, "true");
      }
    }
  }
  return query.toString();
}

export async function patchRows<T>(
  patch: DirectusPatch,
  schema: ZodType<T>
): Promise<T | null> {
  const preflightResponse = await request(
    patch.operation,
    `/items/${patch.collection}?${preflightSearchParams(patch.filter, patch.fields)}`
  );
  const preflightBody = await responseJson(patch.operation, preflightResponse);
  const cardinality = z
    .object({ data: z.array(schema) })
    .safeParse(preflightBody);
  if (!cardinality.success) {
    throw dependencyFailure(`${patch.operation}.response`);
  }
  if (cardinality.data.data.length === 0) return null;
  if (cardinality.data.data.length > 1) {
    throw dependencyFailure(`${patch.operation}.response`);
  }
  const query = new URLSearchParams({ fields: patch.fields });
  const response = await request(
    patch.operation,
    `/items/${patch.collection}?${query.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: patch.data,
        query: { filter: patch.filter },
      }),
    }
  );
  const body = await responseJson(patch.operation, response);
  const parsed = z
    .object({ data: z.array(schema).max(1) })
    .safeParse(body);
  if (!parsed.success) {
    throw dependencyFailure(`${patch.operation}.response`);
  }
  return parsed.data.data[0] ?? null;
}

export function isDependencyFailure(
  error: unknown
): error is VerificationPrimitiveError {
  return (
    error instanceof VerificationPrimitiveError &&
    error.code === "DEPENDENCY_FAILURE"
  );
}
