// src/lib/notifications/preference-check.ts

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

/**
 * Checks whether in-app notification is enabled for a user in a specific category.
 * Uses vs_notification_preference (shared across employer and freelancer).
 * Defaults to true if no preference record is set (except marketing categories).
 */
export async function isInAppEnabledForUser(
  userId: number | null | undefined,
  category: string
): Promise<boolean> {
  if (!userId || !DIRECTUS_BASE) return true;

  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_notification_preference?filter[user_id][_eq]=${userId}&filter[category][_eq]=${encodeURIComponent(category)}&fields=in_app_enabled&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      console.warn(
        `[NOTIFICATION PREFERENCE WARNING] Failed to query preference for user ${userId}, category ${category}. Status: ${res.status}`
      );
      return true;
    }

    const json = await res.json();
    const records = json.data ?? [];

    if (records.length === 0) {
      // Default: disable for marketing categories, enable for all others
      if (category === "MARKETING_UPDATES") return false;
      return true;
    }

    const rec = records[0];
    return rec.in_app_enabled === 1 || rec.in_app_enabled === true;
  } catch (err) {
    console.error(
      `[NOTIFICATION PREFERENCE ERROR] Failed checking in-app preference for user ${userId}, category ${category}:`,
      err
    );
    return true;
  }
}
