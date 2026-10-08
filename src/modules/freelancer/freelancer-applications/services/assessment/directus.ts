// Directus connection + JSON helpers for the freelancer assessment APIs.
// Same base-url/token/headers and PH-time conventions as the existing
// freelancer and job services.

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export const ASSESSMENT_PROOF_FOLDER_ID =
  process.env.DIRECTUS_ASSESSMENT_PROOF_FOLDER_ID?.trim() ||
  "49ce8918-ac09-476f-9b25-14a2c9dfad48";

export function directusBase(): string {
  return DIRECTUS_BASE;
}

export function directusHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return headers;
}

export function directusAuthHeader(): Record<string, string> {
  if (DIRECTUS_TOKEN) return { Authorization: `Bearer ${DIRECTUS_TOKEN}` };
  return {};
}

/** Philippine local-time string, matching the freelancer/job services. */
export function nowPH(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export interface DirectusResult {
  ok: boolean;
  status: number;
  data: unknown;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function directusGet(path: string): Promise<DirectusResult> {
  const response = await fetch(`${DIRECTUS_BASE}${path}`, {
    headers: directusHeaders(),
    cache: "no-store",
  });
  return { ok: response.ok, status: response.status, data: await parseJson(response) };
}

function collectionData(json: unknown): Record<string, unknown>[] {
  if (typeof json !== "object" || json === null) return [];
  const data = (json as { data?: unknown }).data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function directusList(
  collection: string,
  params: URLSearchParams,
): Promise<Record<string, unknown>[]> {
  const result = await directusGet(`/items/${collection}?${params.toString()}`);
  if (!result.ok) throw new Error(`Directus list ${collection} failed: ${result.status}`);
  return collectionData(result.data);
}

export async function directusGetOne(
  collection: string,
  id: number | string,
  fields: string,
): Promise<Record<string, unknown> | null> {
  const result = await directusGet(
    `/items/${collection}/${encodeURIComponent(String(id))}?fields=${encodeURIComponent(fields)}`,
  );
  if (!result.ok) return null;
  const data =
    typeof result.data === "object" && result.data !== null
      ? (result.data as { data?: unknown }).data
      : null;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

export async function directusPost(
  collection: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; row: Record<string, unknown> | null }> {
  const response = await fetch(`${DIRECTUS_BASE}/items/${collection}`, {
    method: "POST",
    headers: directusHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await parseJson(response);
  const data =
    typeof json === "object" && json !== null
      ? (json as { data?: unknown }).data
      : null;
  const row =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  return { ok: response.ok, status: response.status, row };
}

export async function directusPatch(
  collection: string,
  id: number | string,
  body: Record<string, unknown>,
): Promise<boolean> {
  const response = await fetch(
    `${DIRECTUS_BASE}/items/${collection}/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      headers: directusHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  return response.ok;
}

/** Best-effort compensation delete for an orphaned Directus file. */
export async function deleteDirectusFile(fileId: string): Promise<void> {
  try {
    await fetch(`${DIRECTUS_BASE}/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: directusHeaders(),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[freelancer-assessment] compensation file delete failed:", error);
  }
}
