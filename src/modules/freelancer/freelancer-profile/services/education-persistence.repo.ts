import "server-only";

import { z } from "zod";

const EDUCATION_FIELDS = [
  "employee_education_id",
  "user_id",
  "school_id",
  "school_name_raw",
  "course_name_raw",
  "education_status",
  "school_course_id",
  "course_request_draft_key",
  "start_date",
  "end_date",
].join(",");

const educationRowSchema = z.object({
  employee_education_id: z.coerce.number().int().positive(),
  user_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive().nullable(),
  school_name_raw: z.string().nullable(),
  course_name_raw: z.string().nullable(),
  education_status: z.literal("Pending"),
  school_course_id: z.coerce.number().int().positive().nullable(),
  course_request_draft_key: z.uuid().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

export type PersistedPendingEducation = z.infer<typeof educationRowSchema>;

export type PendingEducationWrite = {
  readonly school_id: number | null;
  readonly school_name_raw: string | null;
  readonly course_name_raw: string | null;
  readonly school_course_id: number | null;
  readonly course_request_draft_key: string | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
};

export class EducationPersistenceError extends Error {
  public readonly name = "EducationPersistenceError";
}

function config(): { readonly baseUrl: string; readonly headers: Record<string, string> } {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!baseUrl || !token) {
    throw new EducationPersistenceError("Education storage is not configured.");
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

const courseSchema = z.object({
  school_course_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive(),
  course_status: z.literal("Active"),
});

async function requireActiveSameSchoolCourse(
  schoolId: number,
  schoolCourseId: number
): Promise<void> {
  const { baseUrl, headers } = config();
  const query = new URLSearchParams({
    fields: "school_course_id,school_id,course_status",
  });
  const response = await fetch(
    `${baseUrl}/items/vs_school_course/${schoolCourseId}?${query.toString()}`,
    { headers, cache: "no-store" }
  );
  if (!response.ok) {
    throw new EducationPersistenceError("The selected course is unavailable.");
  }
  const parsed = z.object({ data: courseSchema }).safeParse(await response.json());
  if (
    !parsed.success ||
    parsed.data.data.school_course_id !== schoolCourseId ||
    parsed.data.data.school_id !== schoolId
  ) {
    throw new EducationPersistenceError("The selected course is invalid for this school.");
  }
}

async function requireValidCourseClaim(input: PendingEducationWrite): Promise<void> {
  if (input.school_id !== null && input.school_course_id !== null) {
    await requireActiveSameSchoolCourse(input.school_id, input.school_course_id);
  }
}

function parseRows(body: unknown): PersistedPendingEducation[] {
  const parsed = z.object({ data: z.array(educationRowSchema).max(1) }).safeParse(body);
  if (!parsed.success) {
    throw new EducationPersistenceError("Education storage returned an invalid result.");
  }
  return parsed.data.data;
}

async function fetchRows(query: URLSearchParams): Promise<PersistedPendingEducation[]> {
  const { baseUrl, headers } = config();
  const response = await fetch(`${baseUrl}/items/vs_employee_education?${query.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new EducationPersistenceError("Education storage is temporarily unavailable.");
  }
  return parseRows(await response.json());
}

async function fetchByDraftKey(
  userId: number,
  draftKey: string
): Promise<PersistedPendingEducation | null> {
  const query = new URLSearchParams({ fields: EDUCATION_FIELDS, limit: "2" });
  query.set("filter[user_id][_eq]", String(userId));
  query.set("filter[course_request_draft_key][_eq]", draftKey);
  return (await fetchRows(query))[0] ?? null;
}

function sameClaim(row: PersistedPendingEducation, input: PendingEducationWrite): boolean {
  return (
    row.school_id === input.school_id &&
    row.school_name_raw === input.school_name_raw &&
    row.course_name_raw === input.course_name_raw &&
    row.school_course_id === input.school_course_id &&
    row.course_request_draft_key === input.course_request_draft_key &&
    row.start_date === input.start_date &&
    row.end_date === input.end_date
  );
}

function pendingPayload(userId: number, input: PendingEducationWrite): Record<string, unknown> {
  return {
    user_id: userId,
    school_id: input.school_id,
    school_name_raw: input.school_name_raw,
    course_name_raw: input.course_name_raw,
    education_status: "Pending",
    school_course_id: input.school_course_id,
    course_request_draft_key: input.course_request_draft_key,
    start_date: input.start_date,
    end_date: input.end_date,
  };
}

function requireSameClaim(
  row: PersistedPendingEducation,
  input: PendingEducationWrite
): PersistedPendingEducation {
  if (!sameClaim(row, input)) {
    throw new EducationPersistenceError("This education draft key is already in use.");
  }
  return row;
}

export async function createOrFetchPendingEducation(
  userId: number,
  input: PendingEducationWrite & { readonly course_request_draft_key: string }
): Promise<PersistedPendingEducation> {
  await requireValidCourseClaim(input);
  const existing = await fetchByDraftKey(userId, input.course_request_draft_key);
  if (existing) return requireSameClaim(existing, input);

  const { baseUrl, headers } = config();
  try {
    const response = await fetch(
      `${baseUrl}/items/vs_employee_education?fields=${encodeURIComponent(EDUCATION_FIELDS)}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(pendingPayload(userId, input)),
        cache: "no-store",
      }
    );
    if (response.ok) {
      const parsed = z.object({ data: educationRowSchema }).safeParse(await response.json());
      if (parsed.success) return requireSameClaim(parsed.data.data, input);
    }
  } catch (error: unknown) {
    if (error instanceof EducationPersistenceError) throw error;
  }

  const recovered = await fetchByDraftKey(userId, input.course_request_draft_key);
  if (recovered) return requireSameClaim(recovered, input);
  throw new EducationPersistenceError("Education could not be saved.");
}

const educationAnyStatusSchema = z.object({
  employee_education_id: z.coerce.number().int().positive(),
  user_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive().nullable(),
  school_name_raw: z.string().nullable(),
  course_name_raw: z.string().nullable(),
  education_status: z.string(),
  school_course_id: z.coerce.number().int().positive().nullable(),
  course_request_draft_key: z.uuid().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

type AnyStatusEducation = z.infer<typeof educationAnyStatusSchema>;

function sameClaimAnyStatus(row: AnyStatusEducation, input: PendingEducationWrite): boolean {
  return (
    row.school_id === input.school_id &&
    row.school_name_raw === input.school_name_raw &&
    row.course_name_raw === input.course_name_raw &&
    row.school_course_id === input.school_course_id &&
    row.course_request_draft_key === input.course_request_draft_key &&
    row.start_date === input.start_date &&
    row.end_date === input.end_date
  );
}

async function fetchAnyStatusRow(
  educationId: number,
  userId: number
): Promise<AnyStatusEducation | null> {
  const { baseUrl, headers } = config();
  const query = new URLSearchParams({ fields: EDUCATION_FIELDS, limit: "2" });
  query.set("filter[employee_education_id][_eq]", String(educationId));
  query.set("filter[user_id][_eq]", String(userId));
  const response = await fetch(`${baseUrl}/items/vs_employee_education?${query.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new EducationPersistenceError("Education storage is temporarily unavailable.");
  }
  const parsed = z
    .object({ data: z.array(educationAnyStatusSchema).max(1) })
    .safeParse(await response.json());
  if (!parsed.success) {
    throw new EducationPersistenceError("Education storage returned an invalid result.");
  }
  return parsed.data.data[0] ?? null;
}

export async function updatePendingEducation(
  educationId: number,
  userId: number,
  input: PendingEducationWrite
): Promise<PersistedPendingEducation> {
  const query = new URLSearchParams({ fields: EDUCATION_FIELDS, limit: "2" });
  query.set("filter[employee_education_id][_eq]", String(educationId));
  query.set("filter[user_id][_eq]", String(userId));
  const existing = (await fetchRows(query))[0] ?? null;
  if (!existing) throw new EducationPersistenceError("Education was not found.");

  const desired: PendingEducationWrite = {
    ...input,
    course_request_draft_key:
      input.course_request_draft_key ?? existing.course_request_draft_key,
  };
  await requireValidCourseClaim(desired);
  const data = pendingPayload(userId, desired);
  const { baseUrl, headers } = config();
  const patchQuery = new URLSearchParams({ fields: EDUCATION_FIELDS });
  const response = await fetch(
    `${baseUrl}/items/vs_employee_education?${patchQuery.toString()}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        data,
        query: {
          filter: {
            employee_education_id: { _eq: educationId },
            user_id: { _eq: userId },
            education_status: { _eq: "Pending" },
          },
        },
      }),
      cache: "no-store",
    }
  );
  if (!response.ok) throw new EducationPersistenceError("Education could not be updated.");
  const parsed = z
    .object({ data: z.array(educationRowSchema).max(1) })
    .safeParse(await response.json());
  if (!parsed.success) {
    throw new EducationPersistenceError("Education storage returned an invalid result.");
  }
  const patched = parsed.data.data[0] ?? null;
  if (patched) return patched;
  const refetched = await fetchAnyStatusRow(educationId, userId);
  if (
    refetched !== null &&
    refetched.education_status === "Pending" &&
    sameClaimAnyStatus(refetched, desired)
  ) {
    return {
      employee_education_id: refetched.employee_education_id,
      user_id: refetched.user_id,
      school_id: refetched.school_id,
      school_name_raw: refetched.school_name_raw,
      course_name_raw: refetched.course_name_raw,
      education_status: "Pending",
      school_course_id: refetched.school_course_id,
      course_request_draft_key: refetched.course_request_draft_key,
      start_date: refetched.start_date,
      end_date: refetched.end_date,
    };
  }
  throw new EducationPersistenceError("Education was modified by another process.");
}
