// src/modules/vos-admin/contact-messages/services/contact-message.repo.ts
import type {
  ContactMessage,
  ContactMessageListResult,
  ContactMessageListParams,
  ContactMessagePatchBody,
} from "../types/contact-message.types";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const COLLECTION = "vs_contact_messages";

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

/** Insert a new contact message row. Returns the created record. */
export async function insertContactMessageRepo(
  payload: Omit<
    ContactMessage,
    "id" | "status" | "assigned_to" | "internal_note" | "reviewed_by" | "reviewed_at" | "deleted_at" | "updated_at"
  > & { status: "new"; source: string }
): Promise<ContactMessage> {
  const res = await fetch(`${DIRECTUS_BASE}/items/${COLLECTION}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[contact-messages] insert failed ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.data as ContactMessage;
}

/** Fetch a paginated, filtered list of contact messages (excludes soft-deleted). */
export async function fetchContactMessagesRepo(
  params: ContactMessageListParams
): Promise<ContactMessageListResult> {
  const { status, q, from, to, page = 1, pageSize = 20 } = params;
  const safePageSize = Math.min(Math.max(1, pageSize), 100);
  const offset = (Math.max(1, page) - 1) * safePageSize;

  const filters: string[] = [
    // Exclude soft-deleted rows
    `"deleted_at":{"_null":true}`,
  ];

  if (status && status !== "all") {
    filters.push(`"status":{"_eq":"${status}"}`);
  }
  if (from) {
    filters.push(`"created_at":{"_gte":"${from}"}`);
  }
  if (to) {
    filters.push(`"created_at":{"_lte":"${to}"}`);
  }

  const filterStr = `filter={${filters.join(",")}}`;

  const baseFields = "id,name,email,company,subject,message,user_id,user_role,status,source,assigned_to,internal_note,reviewed_by,reviewed_at,ip_hash,created_at,updated_at,deleted_at";

  // Search: ILIKE on name, email, subject, company
  let searchFilter = "";
  if (q && q.trim()) {
    const safe = encodeURIComponent(q.trim());
    searchFilter = `&filter[_and][0][deleted_at][_null]=true&filter[_and][1][_or][0][name][_icontains]=${safe}&filter[_and][1][_or][1][email][_icontains]=${safe}&filter[_and][1][_or][2][subject][_icontains]=${safe}&filter[_and][1][_or][3][company][_icontains]=${safe}`;
  }

  // If search is present, use a simpler filter string to avoid conflicts
  let url: string;
  if (q && q.trim()) {
    const safe = encodeURIComponent(q.trim());
    const extraStatus = status && status !== "all" ? `&filter[_and][2][status][_eq]=${encodeURIComponent(status)}` : "";
    const extraFrom = from ? `&filter[_and][3][created_at][_gte]=${encodeURIComponent(from)}` : "";
    const extraTo = to ? `&filter[_and][4][created_at][_lte]=${encodeURIComponent(to)}` : "";
    url = `${DIRECTUS_BASE}/items/${COLLECTION}?fields=${baseFields}&limit=${safePageSize}&offset=${offset}&sort[]=-created_at&meta=total_count&filter[_and][0][deleted_at][_null]=true&filter[_and][1][_or][0][name][_icontains]=${safe}&filter[_and][1][_or][1][email][_icontains]=${safe}&filter[_and][1][_or][2][subject][_icontains]=${safe}&filter[_and][1][_or][3][company][_icontains]=${safe}${extraStatus}${extraFrom}${extraTo}`;
  } else {
    url = `${DIRECTUS_BASE}/items/${COLLECTION}?fields=${baseFields}&limit=${safePageSize}&offset=${offset}&sort[]=-created_at&meta=total_count&${filterStr}`;
  }

  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[contact-messages] list failed ${res.status}: ${text}`);
    // If collection does not exist yet in Directus, return empty result instead of throwing 500
    if (res.status === 403 || res.status === 404) {
      return { items: [], total: 0 };
    }
    throw new Error(`[contact-messages] list failed ${res.status}: ${text}`);
  }

  const json = await res.json();
  return {
    items: (json.data ?? []) as ContactMessage[],
    total: Number(json.meta?.total_count ?? 0),
  };
}

/** Count messages where status = 'new' and not soft-deleted. */
export async function countNewContactMessagesRepo(): Promise<number> {
  const url = `${DIRECTUS_BASE}/items/${COLLECTION}?aggregate[count]=id&filter[status][_eq]=new&filter[deleted_at][_null]=true`;
  const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });
  if (!res.ok) return 0;
  const json = await res.json();
  return Number(json.data?.[0]?.count?.id ?? 0);
}

/** Fetch a single contact message by ID. */
export async function fetchContactMessageByIdRepo(
  id: number
): Promise<ContactMessage | null> {
  const fields = "id,name,email,company,subject,message,user_id,user_role,status,source,assigned_to,internal_note,reviewed_by,reviewed_at,ip_hash,created_at,updated_at,deleted_at";
  const res = await fetch(`${DIRECTUS_BASE}/items/${COLLECTION}/${id}?fields=${fields}`, {
    headers: getHeaders(),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[contact-messages] fetch by id failed ${res.status}: ${text}`);
  }
  const json = await res.json();
  const row = json.data as ContactMessage | null;
  // Treat soft-deleted as not found
  if (!row || row.deleted_at) return null;
  return row;
}

/** Update status and/or internal_note. Also records reviewer and timestamp. */
export async function patchContactMessageRepo(
  id: number,
  patch: ContactMessagePatchBody & { reviewed_by: number; reviewed_at: string; updated_at: string }
): Promise<ContactMessage> {
  const res = await fetch(`${DIRECTUS_BASE}/items/${COLLECTION}/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[contact-messages] patch failed ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.data as ContactMessage;
}

/** Soft-delete a contact message by setting deleted_at. */
export async function softDeleteContactMessageRepo(
  id: number,
  deletedAt: string
): Promise<void> {
  const res = await fetch(`${DIRECTUS_BASE}/items/${COLLECTION}/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ deleted_at: deletedAt }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[contact-messages] soft-delete failed ${res.status}: ${text}`);
  }
}

/** Mark a 'new' message as 'read' and record the reviewing admin. */
export async function markAsReadRepo(
  id: number,
  adminId: number,
  now: string
): Promise<void> {
  await fetch(`${DIRECTUS_BASE}/items/${COLLECTION}/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({
      status: "read",
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now,
    }),
    cache: "no-store",
  });
}
