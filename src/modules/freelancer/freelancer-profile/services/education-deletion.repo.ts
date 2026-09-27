import "server-only";

import { z } from "zod";

const educationSchema = z.object({
  employee_education_id: z.coerce.number().int().positive(),
});

const requestSchema = z.object({
  school_request_id: z.coerce.number().int().positive(),
  requested_by: z.coerce.number().int().positive(),
});

export class EducationDeletionError extends Error {
  public readonly name = "EducationDeletionError";
}

function config(): { readonly baseUrl: string; readonly headers: Record<string, string> } {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/u, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!baseUrl || !token) {
    throw new EducationDeletionError("Education storage is not configured.");
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

async function deleteItem(
  collection: "vs_school_request" | "vs_employee_education",
  id: number,
  message: string
): Promise<void> {
  const { baseUrl, headers } = config();
  const response = await fetch(`${baseUrl}/items/${collection}/${id}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });
  if (!response.ok) throw new EducationDeletionError(message);
}

export async function deletePendingEducationAndRequests(
  educationId: number,
  userId: number
): Promise<void> {
  const { baseUrl, headers } = config();
  const educationQuery = new URLSearchParams({ fields: "employee_education_id", limit: "2" });
  educationQuery.set("filter[employee_education_id][_eq]", String(educationId));
  educationQuery.set("filter[user_id][_eq]", String(userId));
  educationQuery.set("filter[education_status][_eq]", "Pending");
  const educationResponse = await fetch(
    `${baseUrl}/items/vs_employee_education?${educationQuery.toString()}`,
    { headers, cache: "no-store" }
  );
  const education = educationResponse.ok
    ? z.object({ data: z.array(educationSchema).max(1) }).safeParse(await educationResponse.json())
    : null;
  if (!education?.success || education.data.data.length !== 1) {
    throw new EducationDeletionError("Education was not found.");
  }

  const requestQuery = new URLSearchParams({
    fields: "school_request_id,requested_by",
    limit: "-1",
  });
  requestQuery.set("filter[employee_education_id][_eq]", String(educationId));
  const requestResponse = await fetch(
    `${baseUrl}/items/vs_school_request?${requestQuery.toString()}`,
    { headers, cache: "no-store" }
  );
  const requests = requestResponse.ok
    ? z.object({ data: z.array(requestSchema) }).safeParse(await requestResponse.json())
    : null;
  if (!requests?.success || requests.data.data.some((request) => request.requested_by !== userId)) {
    throw new EducationDeletionError("Attendance request linkage is invalid.");
  }

  for (const request of requests.data.data) {
    await deleteItem(
      "vs_school_request",
      request.school_request_id,
      "Attendance request could not be deleted."
    );
  }
  await deleteItem("vs_employee_education", educationId, "Education could not be deleted.");
}
