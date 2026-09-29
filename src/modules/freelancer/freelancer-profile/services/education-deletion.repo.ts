import "server-only";

import { z } from "zod";

const educationSchema = z.object({
  employee_education_id: z.coerce.number().int().positive(),
});

const linkRowSchema = z.object({
  requested_by: z
    .union([
      z.coerce.number().int().positive(),
      z.object({ user_id: z.coerce.number().int().positive() }),
    ])
    .transform((value) => (typeof value === "number" ? value : value.user_id)),
});

const idRowSchema = z.object({ id: z.coerce.number().int().positive() });

export type EducationDeletionErrorCode =
  | "NOT_FOUND"
  | "LINKAGE_INVALID"
  | "DEPENDENCY_FAILURE";

export class EducationDeletionError extends Error {
  public readonly name = "EducationDeletionError";
  public readonly code: EducationDeletionErrorCode;

  constructor(message: string, code: EducationDeletionErrorCode = "DEPENDENCY_FAILURE") {
    super(message);
    this.code = code;
  }
}

function config(): { readonly baseUrl: string; readonly headers: Record<string, string> } {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!baseUrl || !token) {
    throw new EducationDeletionError("Education storage is not configured.", "DEPENDENCY_FAILURE");
  }
  return {
    baseUrl,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

const NOT_FOUND_MESSAGE = "This education record was not found on your profile.";
const STORAGE_MESSAGE = "Education could not be deleted.";
const INCONSISTENT_MESSAGE =
  "This education's linked records are inconsistent, so it could not be removed.";

type LinkCollection = "vs_school_request" | "vs_course_request";

function parseRows(
  payload: unknown,
  message: string
): readonly Record<string, unknown>[] {
  const parsed = z
    .object({ data: z.array(z.record(z.string(), z.unknown())) })
    .safeParse(payload);
  if (!parsed.success) {
    throw new EducationDeletionError(message, "DEPENDENCY_FAILURE");
  }
  return parsed.data.data;
}

async function fetchRows(
  collection: LinkCollection | "vs_school_student",
  query: URLSearchParams
): Promise<readonly Record<string, unknown>[]> {
  const { baseUrl, headers } = config();
  const response = await fetch(`${baseUrl}/items/${collection}?${query.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new EducationDeletionError(STORAGE_MESSAGE, "DEPENDENCY_FAILURE");
  }
  return parseRows(await response.json().catch(() => null), STORAGE_MESSAGE);
}

function requireIds(
  rows: readonly Record<string, unknown>[],
  field: string,
  message: string
): number[] {
  const ids: number[] = [];
  for (const row of rows) {
    const parsed = idRowSchema.safeParse({ id: row[field] });
    if (!parsed.success) {
      throw new EducationDeletionError(message, "DEPENDENCY_FAILURE");
    }
    ids.push(parsed.data.id);
  }
  return ids;
}

async function assertOwnedLinks(
  collection: LinkCollection,
  query: URLSearchParams,
  userId: number
): Promise<void> {
  const rows = await fetchRows(collection, query);
  for (const row of rows) {
    const owner = linkRowSchema.safeParse({ requested_by: row.requested_by });
    if (!owner.success || owner.data.requested_by !== userId) {
      throw new EducationDeletionError(INCONSISTENT_MESSAGE, "LINKAGE_INVALID");
    }
  }
}

async function hasOwnedEducation(educationId: number, userId: number): Promise<boolean> {
  const { baseUrl, headers } = config();
  const query = new URLSearchParams({ fields: "employee_education_id", limit: "2" });
  query.set("filter[employee_education_id][_eq]", String(educationId));
  query.set("filter[user_id][_eq]", String(userId));
  const response = await fetch(`${baseUrl}/items/vs_employee_education?${query.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) return false;
  const parsed = z
    .object({ data: z.array(educationSchema).max(1) })
    .safeParse(await response.json().catch(() => null));
  return parsed.success && parsed.data.data.length === 1;
}

async function deleteItem(
  collection:
    | "vs_school_student"
    | "vs_school_request"
    | "vs_course_request"
    | "vs_employee_education",
  id: number
): Promise<void> {
  const { baseUrl, headers } = config();
  const response = await fetch(`${baseUrl}/items/${collection}/${id}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) {
    throw new EducationDeletionError(STORAGE_MESSAGE, "DEPENDENCY_FAILURE");
  }
}

export async function deleteOwnedEducationWithLinks(
  educationId: number,
  userId: number
): Promise<void> {
  config();
  if (!(await hasOwnedEducation(educationId, userId))) {
    throw new EducationDeletionError(NOT_FOUND_MESSAGE, "NOT_FOUND");
  }

  const rosterQuery = new URLSearchParams({ limit: "-1", fields: "student_id" });
  rosterQuery.set("filter[employee_education_id][_eq]", String(educationId));

  const schoolRequestQuery = new URLSearchParams({
    limit: "-1",
    fields: "school_request_id,requested_by",
  });
  schoolRequestQuery.set("filter[_or][0][employee_education_id][_eq]", String(educationId));
  schoolRequestQuery.set("filter[_or][1][active_employee_education_id][_eq]", String(educationId));

  const courseRequestQuery = new URLSearchParams({
    limit: "-1",
    fields: "course_request_id,requested_by",
  });
  courseRequestQuery.set("filter[employee_education_id][_eq]", String(educationId));

  await assertOwnedLinks("vs_school_request", schoolRequestQuery, userId);
  await assertOwnedLinks("vs_course_request", courseRequestQuery, userId);

  const rosterIds = requireIds(
    await fetchRows("vs_school_student", rosterQuery),
    "student_id",
    STORAGE_MESSAGE
  );
  const schoolRequestIds = requireIds(
    await fetchRows("vs_school_request", schoolRequestQuery),
    "school_request_id",
    STORAGE_MESSAGE
  );
  const courseRequestIds = requireIds(
    await fetchRows("vs_course_request", courseRequestQuery),
    "course_request_id",
    STORAGE_MESSAGE
  );

  for (const id of rosterIds) await deleteItem("vs_school_student", id);
  for (const id of schoolRequestIds) await deleteItem("vs_school_request", id);
  for (const id of courseRequestIds) await deleteItem("vs_course_request", id);

  if (!(await hasOwnedEducation(educationId, userId))) {
    throw new EducationDeletionError(NOT_FOUND_MESSAGE, "NOT_FOUND");
  }
  await deleteItem("vs_employee_education", educationId);
}
