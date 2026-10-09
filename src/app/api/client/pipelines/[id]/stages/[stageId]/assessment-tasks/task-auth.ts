// Shared auth + company-resolution helpers for the company pipeline
// assessment-task routes. Mirrors the existing client-pipeline route pattern:
// session from `authenticateRequest`, company from `vs_company_user`.

export const TASK_DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const TASK_DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export function getTaskRouteHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (TASK_DIRECTUS_TOKEN)
    headers.Authorization = `Bearer ${TASK_DIRECTUS_TOKEN}`;
  return headers;
}

export async function resolveTaskRouteCompany(
  userId: string | number
): Promise<number | null> {
  try {
    const res = await fetch(
      `${TASK_DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${String(userId)}&fields=company_id&limit=1`,
      { headers: getTaskRouteHeaders(), cache: "no-store" }
    );
    const json = (await res.json()) as {
      data?: Array<{ company_id?: number | string }>;
    };
    const raw = json.data?.[0]?.company_id ?? null;
    if (raw === null || raw === undefined) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
