// src/lib/mail/preference-check.ts

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) {
    headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return headers;
}

/**
 * Checks whether email notification is enabled for a user in a specific category.
 * Defaults to true if no preference record is configured (unless it's marketing/promotional).
 */
export async function isEmailEnabledForUser(
  userId: number | null | undefined,
  category: string
): Promise<boolean> {
  if (!userId || !DIRECTUS_BASE) {
    // Default to true if user ID or Directus base URL is not available
    return true;
  }

  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_notification_preference?filter[user_id][_eq]=${userId}&filter[category][_eq]=${encodeURIComponent(category)}&fields=email_enabled&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      console.warn(`[MAIL PREFERENCE WARNING] Failed to query preference for user ${userId}, category ${category}. Status: ${res.status}`);
      return true; // Default fallback to true on error
    }

    const json = await res.json();
    const records = json.data ?? [];

    if (records.length === 0) {
      // Default preferences for categories not yet saved in DB
      if (category === "MARKETING_UPDATES" || category === "PRODUCT_UPDATES") {
        return false;
      }
      return true;
    }

    const rec = records[0];
    return rec.email_enabled === 1 || rec.email_enabled === true;
  } catch (err) {
    console.error(`[MAIL PREFERENCE ERROR] Failed checking email preference for user ${userId}, category ${category}:`, err);
    return true;
  }
}
