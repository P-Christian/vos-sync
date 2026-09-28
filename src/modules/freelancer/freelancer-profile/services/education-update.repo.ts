import "server-only";

import { z } from "zod";
import type {
  PendingEducationWrite,
  PersistedPendingEducation,
} from "./education-persistence.repo";

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

const anyStatusEducationSchema = z.object({
  employee_education_id: z.coerce.number().int().positive(),
  user_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive().nullable(),
  school_name_raw: z.string().nullable(),
  course_name_raw: z.string().nullable(),
  education_status: z.enum(["Pending", "Verified", "Unverified"]),
  school_course_id: z.coerce.number().int().positive().nullable(),
  course_request_draft_key: z.uuid().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

const pendingEducationSchema = anyStatusEducationSchema.extend({
  education_status: z.literal("Pending"),
});

const activeCourseSchema = z.object({
  school_course_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive(),
  course_name: z.string().trim().min(1),
  course_status: z.literal("Active"),
});

export type AnyStatusEducation = z.infer<typeof anyStatusEducationSchema>;

export class EducationUpdateError extends Error {
  public readonly name = "EducationUpdateError";
}

function config(): { readonly baseUrl: string; readonly headers: Record<string, string> } {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!baseUrl || !token) throw new EducationUpdateError("Education storage is not configured.");
  return {
    baseUrl,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

export async function fetchOwnedEducation(
  educationId: number,
  userId: number
): Promise<AnyStatusEducation> {
  const { baseUrl, headers } = config();
  const query = new URLSearchParams({ fields: EDUCATION_FIELDS, limit: "2" });
  query.set("filter[employee_education_id][_eq]", String(educationId));
  query.set("filter[user_id][_eq]", String(userId));
  const response = await fetch(`${baseUrl}/items/vs_employee_education?${query.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) throw new EducationUpdateError("Education storage is temporarily unavailable.");
  const parsed = z.object({ data: z.array(anyStatusEducationSchema).max(1) }).safeParse(
    await response.json()
  );
  if (!parsed.success) throw new EducationUpdateError("Education storage returned an invalid result.");
  const row = parsed.data.data[0];
  if (!row) throw new EducationUpdateError("Education was not found.");
  return row;
}

async function requireActiveCourse(
  schoolId: number,
  courseId: number
): Promise<z.infer<typeof activeCourseSchema>> {
  const { baseUrl, headers } = config();
  const query = new URLSearchParams({
    fields: "school_course_id,school_id,course_name,course_status",
  });
  const response = await fetch(
    `${baseUrl}/items/vs_school_course/${courseId}?${query.toString()}`,
    { headers, cache: "no-store" }
  );
  if (!response.ok) throw new EducationUpdateError("The selected course is unavailable.");
  const parsed = z.object({ data: activeCourseSchema }).safeParse(await response.json());
  if (
    !parsed.success ||
    parsed.data.data.school_course_id !== courseId ||
    parsed.data.data.school_id !== schoolId
  ) {
    throw new EducationUpdateError("The selected course is invalid for this school.");
  }
  return parsed.data.data;
}

export async function resolveCourseRequestName(
  input: PendingEducationWrite
): Promise<string | null> {
  if (input.school_id !== null && input.school_course_id !== null) {
    return (await requireActiveCourse(input.school_id, input.school_course_id)).course_name;
  }
  const rawName = input.course_name_raw?.trim() ?? "";
  return rawName.length > 0 ? rawName : null;
}

function pendingPayload(
  userId: number,
  input: PendingEducationWrite
): Readonly<Record<string, unknown>> {
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

function samePendingWrite(
  row: AnyStatusEducation,
  input: PendingEducationWrite
): row is PersistedPendingEducation {
  return (
    row.education_status === "Pending" &&
    row.school_id === input.school_id &&
    row.school_name_raw === input.school_name_raw &&
    row.course_name_raw === input.course_name_raw &&
    row.school_course_id === input.school_course_id &&
    row.course_request_draft_key === input.course_request_draft_key &&
    row.start_date === input.start_date &&
    row.end_date === input.end_date
  );
}

export async function updatePendingEducation(
  educationId: number,
  userId: number,
  input: PendingEducationWrite
): Promise<PersistedPendingEducation> {
  const existing = await fetchOwnedEducation(educationId, userId);
  if (existing.education_status !== "Pending") {
    throw new EducationUpdateError("Education was not found.");
  }
  const desired = {
    ...input,
    course_request_draft_key:
      input.course_request_draft_key ?? existing.course_request_draft_key,
  } satisfies PendingEducationWrite;
  await resolveCourseRequestName(desired);

  const { baseUrl, headers } = config();
  const query = new URLSearchParams({ fields: EDUCATION_FIELDS });
  const response = await fetch(`${baseUrl}/items/vs_employee_education?${query.toString()}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      data: pendingPayload(userId, desired),
      query: {
        filter: {
          employee_education_id: { _eq: educationId },
          user_id: { _eq: userId },
          education_status: { _eq: "Pending" },
        },
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new EducationUpdateError("Education could not be updated.");
  const parsed = z.object({ data: z.array(pendingEducationSchema).max(1) }).safeParse(
    await response.json()
  );
  if (!parsed.success) throw new EducationUpdateError("Education storage returned an invalid result.");
  const patched = parsed.data.data[0];
  if (patched) return patched;
  const refetched = await fetchOwnedEducation(educationId, userId);
  if (samePendingWrite(refetched, desired)) return refetched;
  throw new EducationUpdateError("Education was modified by another process.");
}

function nullableGuard(value: number | null): Readonly<Record<string, unknown>> {
  return value === null ? { _null: true } : { _eq: value };
}

function sameVerifiedWrite(row: AnyStatusEducation, input: PendingEducationWrite): boolean {
  return (
    row.education_status === "Verified" &&
    row.school_course_id === input.school_course_id &&
    row.course_name_raw === input.course_name_raw &&
    row.start_date === input.start_date &&
    row.end_date === input.end_date
  );
}

export async function updateVerifiedEducation(
  educationId: number,
  userId: number,
  input: PendingEducationWrite
): Promise<AnyStatusEducation> {
  const existing = await fetchOwnedEducation(educationId, userId);
  if (existing.education_status !== "Verified") {
    throw new EducationUpdateError("This education record is not verified.");
  }
  if (existing.school_id !== input.school_id || existing.school_name_raw !== input.school_name_raw) {
    throw new EducationUpdateError("The school is locked after attendance has been verified.");
  }
  await resolveCourseRequestName(input);

  const { baseUrl, headers } = config();
  const query = new URLSearchParams({ fields: EDUCATION_FIELDS });
  const response = await fetch(`${baseUrl}/items/vs_employee_education?${query.toString()}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      data: {
        school_course_id: input.school_course_id,
        course_name_raw: input.course_name_raw,
        start_date: input.start_date,
        end_date: input.end_date,
      },
      query: {
        filter: {
          employee_education_id: { _eq: educationId },
          user_id: { _eq: userId },
          education_status: { _eq: "Verified" },
          school_id: nullableGuard(existing.school_id),
          school_course_id: nullableGuard(existing.school_course_id),
        },
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new EducationUpdateError("Education could not be updated.");
  const parsed = z.object({ data: z.array(anyStatusEducationSchema).max(1) }).safeParse(
    await response.json()
  );
  if (!parsed.success) throw new EducationUpdateError("Education storage returned an invalid result.");
  const patched = parsed.data.data[0];
  if (patched) return patched;
  const refetched = await fetchOwnedEducation(educationId, userId);
  if (sameVerifiedWrite(refetched, input)) return refetched;
  throw new EducationUpdateError("Education was modified by another process.");
}
