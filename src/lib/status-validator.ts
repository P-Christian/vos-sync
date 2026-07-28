// src/lib/status-validator.ts

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
 * Checks if a user has an active, unexpired capability restriction.
 * Utilizes a 15-second revalidated fetch cache.
 */
export async function checkRestriction(userId: number, restrictionCode: string): Promise<boolean> {
  try {
    const userStatus = await checkUserStatus(userId);
    if (!userStatus || userStatus.status === 'ACTIVE') {
      return false;
    }

    const url = `${DIRECTUS_BASE}/items/vs_account_restriction?filter[user_id][_eq]=${userId}&filter[code][_eq]=${restrictionCode}&filter[status][_eq]=ACTIVE&limit=1`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 15 } // Cache check for 15 seconds
    });

    if (!res.ok) {
      console.error(`[status-validator] Error checking restriction for user #${userId}: ${res.statusText}`);
      return false;
    }

    const json = await res.json();
    const restrictions = json.data || [];
    if (restrictions.length === 0) return false;

    // Check expiration timestamp
    const restriction = restrictions[0];
    if (restriction.expires_at) {
      const expiry = new Date(restriction.expires_at).getTime();
      const now = Date.now();
      if (now > expiry) {
        // Expired restriction
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`[status-validator] Exception checking restriction for user #${userId}:`, error);
    return false;
  }
}

/**
 * Checks the user's general account status and session epoch.
 * Returns the status and session_epoch, utilizing a 15-second revalidated fetch cache.
 */
export async function checkUserStatus(userId: number): Promise<{ status: string; session_epoch?: string | null } | null> {
  try {
    const url = `${DIRECTUS_BASE}/items/vs_user/${userId}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 15 }
    });

    if (!res.ok) {
      console.error(`[status-validator] Error fetching user status details for user #${userId}: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const user = json.data;
    if (!user) return null;

    return {
      status: user.status || 'ACTIVE',
      session_epoch: user.session_epoch
    };
  } catch (error) {
    console.error(`[status-validator] Exception checking status for user #${userId}:`, error);
    return null;
  }
}
