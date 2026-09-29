import { z } from "zod";

import {
  dependencyError,
  SchoolRequestSchoolAdminError,
  type SchoolRequestInbox,
  type SchoolRequestInboxRow,
} from "@/modules/school-admin/school-requests";

/**
 * Route-boundary submitter enrichment.
 *
 * The domain DTO is deliberately identity-free: it exposes only the numeric
 * `requestedBy`. The inbox needs a submitter display label, so the name
 * is resolved HERE, at the HTTP boundary, and appended AFTER the module's
 * closed-world row schema has already parsed the row. The domain module
 * (`src/modules/school-admin/school-requests/**`) stays byte-identical and its
 * privacy guarantees are unchanged.
 *
 * Privacy bound is absolute: ONLY `user_fname`/`user_mname`/`user_lname` ever
 * cross this boundary. Email, contacts, documents, photo, address, and every
 * other profile field are never selected, mapped, or returned.
 */

export type SchoolRequestInboxRowWithSubmitter = SchoolRequestInboxRow & {
  readonly submitterName: string;
};

export interface SchoolRequestInboxWithSubmitters {
  readonly schoolId: number;
  readonly schoolAdminId: number;
  readonly routed: readonly SchoolRequestInboxRowWithSubmitter[];
  readonly finalizing: readonly SchoolRequestInboxRowWithSubmitter[];
}

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/u, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

/** Name parts only. Email/contact/photo/address are never requested. */
const SUBMITTER_FIELDS = "user_id,user_fname,user_mname,user_lname";

const submitterRowSchema = z.object({
  user_id: z.number().int(),
  user_fname: z.string().nullable().optional(),
  user_mname: z.string().nullable().optional(),
  user_lname: z.string().nullable().optional(),
});

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

/**
 * Assemble a display label from name parts only. Missing/blank parts are
 * dropped; if no part survives the result is the empty string. It never
 * substitutes an email or a raw id-derived placeholder, so a real name is
 * never replaced by anything but the real name.
 */
export function formatSubmitterDisplayName(parts: {
  readonly userFname?: string | null;
  readonly userMname?: string | null;
  readonly userLname?: string | null;
}): string {
  return [parts.userFname, parts.userMname, parts.userLname]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0)
    .join(" ");
}

/**
 * Resolve front/last (and middle when present) names for the whole inbox in
 * ONE bounded `vs_user` query - never a per-row N+1. A user row that is absent
 * or has no name parts degrades gracefully to the empty label (never an error,
 * never an email/id fallback). A transport/parse failure fails closed as a
 * sanitized 503 dependency error so a partial label set is never served.
 */
export async function resolveSubmitterNames(
  requestedByIds: readonly number[],
): Promise<ReadonlyMap<number, string>> {
  const names = new Map<number, string>();
  const unique = [...new Set(requestedByIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (unique.length === 0) return names;
  if (!DIRECTUS_BASE) throw dependencyError("schoolRequest.submitter.configuration");

  const query = new URLSearchParams({
    "filter[user_id][_in]": unique.join(","),
    fields: SUBMITTER_FIELDS,
    limit: "-1",
  });

  try {
    const response = await fetch(`${DIRECTUS_BASE}/items/vs_user?${query.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw dependencyError("schoolRequest.submitter", response.status);
    const parsed = z.object({ data: z.array(submitterRowSchema) }).safeParse(await response.json());
    if (!parsed.success) throw dependencyError("schoolRequest.submitter.response");
    for (const row of parsed.data.data) {
      names.set(
        row.user_id,
        formatSubmitterDisplayName({
          userFname: row.user_fname,
          userMname: row.user_mname,
          userLname: row.user_lname,
        }),
      );
    }
    return names;
  } catch (error: unknown) {
    if (error instanceof SchoolRequestSchoolAdminError) throw error;
    throw dependencyError("schoolRequest.submitter", undefined, error);
  }
}

/**
 * Spread the module's already-parsed (closed-world) inbox rows and append the
 * resolved `submitterName`. Every existing DTO field is preserved untouched.
 */
export async function attachSubmitterNames(
  inbox: SchoolRequestInbox,
): Promise<SchoolRequestInboxWithSubmitters> {
  const requestedByIds = [...inbox.routed, ...inbox.finalizing].map((row) => row.requestedBy);
  const names = await resolveSubmitterNames(requestedByIds);
  const enrich = (row: SchoolRequestInboxRow): SchoolRequestInboxRowWithSubmitter => ({
    ...row,
    submitterName: names.get(row.requestedBy) ?? "",
  });
  return {
    schoolId: inbox.schoolId,
    schoolAdminId: inbox.schoolAdminId,
    routed: inbox.routed.map(enrich),
    finalizing: inbox.finalizing.map(enrich),
  };
}
