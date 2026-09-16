import "server-only";

import { z, type ZodType } from "zod";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/u,
  ""
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

class StudentInvitationRepositoryError extends Error {
  public readonly name = "StudentInvitationRepositoryError";

  constructor(options?: ErrorOptions) {
    super("Student invitation storage is temporarily unavailable.", options);
  }
}

/**
 * Build a sanitized dependency failure. Never include a Directus response
 * body: it can contain roster or invitation field values that must not
 * cross the student-invitation boundary.
 */
export function dependencyError(
  operation: string,
  status?: number,
  cause?: unknown
): StudentInvitationRepositoryError {
  console.error("[student-invitation.directus] Directus operation failed", {
    operation,
    status,
  });
  return new StudentInvitationRepositoryError({ cause });
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

export interface DirectusLookup {
  readonly collection: string;
  readonly field: string;
  readonly value: string | number;
  readonly fields: string;
}

export interface DirectusCollectionPatch {
  readonly operation: string;
  readonly collection: string;
  readonly filter: Readonly<Record<string, unknown>>;
  readonly data: Readonly<Record<string, unknown>>;
  readonly fields: string;
}

export function lookupPath(lookup: DirectusLookup): string {
  const query = new URLSearchParams({
    [`filter[${lookup.field}][_eq]`]: String(lookup.value),
    fields: lookup.fields,
    limit: "1",
  });
  return `/items/${lookup.collection}?${query.toString()}`;
}

/** Read the first matching row. A missing row is a normal domain result. */
export async function fetchFirst<T>(
  operation: string,
  path: string,
  schema: ZodType<T>
): Promise<T | null> {
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
    return parsed.data.data[0] ?? null;
  } catch (error: unknown) {
    if (error instanceof StudentInvitationRepositoryError) throw error;
    throw dependencyError(operation, undefined, error);
  }
}

/**
 * Guarded Directus collection PATCH ("update multiple"). The filter travels
 * in the request body because it defines the mutation target; Directus has no
 * compare-and-set, so a zero-row response is expected for stale guards and a
 * response with more than one row is ambiguous and must fail closed.
 */
export async function patchCollection<T>(
  patch: DirectusCollectionPatch,
  schema: ZodType<T>
): Promise<T | null> {
  const { operation, collection, filter, data, fields } = patch;
  if (!DIRECTUS_BASE) throw dependencyError(`${operation}.configuration`);

  try {
    const query = new URLSearchParams({ fields });
    const response = await fetch(
      `${DIRECTUS_BASE}/items/${collection}?${query.toString()}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ data, query: { filter } }),
        cache: "no-store",
      }
    );
    if (!response.ok) throw dependencyError(operation, response.status);

    const body: unknown = await response.json();
    const parsed = z.object({ data: z.array(schema).max(1) }).safeParse(body);
    if (!parsed.success) throw dependencyError(`${operation}.response`);
    return parsed.data.data[0] ?? null;
  } catch (error: unknown) {
    if (error instanceof StudentInvitationRepositoryError) throw error;
    throw dependencyError(operation, undefined, error);
  }
}
