// src/modules/auth/sessions/session.repo.ts
import { getPHTimeString } from "@/lib/utils";

export interface UserSessionRecord {
  session_id: string;
  user_id: number;
  deployment_id: string;
  device_name: string | null;
  device_type: "DESKTOP" | "MOBILE" | "TABLET" | "UNKNOWN";
  browser_name: string | null;
  ip_address: string | null;
  location_label: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity_at: string | null;
  expires_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export interface CreateSessionParams {
  userId: number;
  deploymentId?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  locationLabel?: string | null;
}

function getDirectusConfig() {
  const baseUrl = (
    process.env.DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  return { baseUrl, token };
}

export function parseUserAgent(ua: string | null | undefined): {
  deviceName: string;
  deviceType: "DESKTOP" | "MOBILE" | "TABLET" | "UNKNOWN";
  browserName: string;
} {
  const agent = ua || "";
  let deviceType: "DESKTOP" | "MOBILE" | "TABLET" | "UNKNOWN" = "DESKTOP";
  let deviceName = "PC";
  let browserName = "Web Browser";

  if (/ipad|tablet|(android(?!.*mobile))/i.test(agent)) {
    deviceType = "TABLET";
    deviceName = /ipad/i.test(agent) ? "Apple iPad" : "Android Tablet";
  } else if (/mobile|iphone|ipod|android/i.test(agent)) {
    deviceType = "MOBILE";
    deviceName = /iphone/i.test(agent) ? "Apple iPhone" : /android/i.test(agent) ? "Android Device" : "Mobile Device";
  } else if (/windows/i.test(agent)) {
    deviceType = "DESKTOP";
    deviceName = "Windows PC";
  } else if (/macintosh|mac os x/i.test(agent)) {
    deviceType = "DESKTOP";
    deviceName = "Mac";
  } else if (/linux/i.test(agent)) {
    deviceType = "DESKTOP";
    deviceName = "Linux Desktop";
  } else {
    deviceType = "UNKNOWN";
    deviceName = "Unknown Device";
  }

  if (/edg/i.test(agent)) {
    browserName = "Microsoft Edge";
  } else if (/chrome|crios/i.test(agent)) {
    browserName = "Google Chrome";
  } else if (/firefox|fxios/i.test(agent)) {
    browserName = "Mozilla Firefox";
  } else if (/safari/i.test(agent) && !/chrome|crios/i.test(agent)) {
    browserName = "Apple Safari";
  } else if (/opera|opr/i.test(agent)) {
    browserName = "Opera";
  }

  return { deviceName, deviceType, browserName };
}

/**
 * Creates and registers a new active session record in vs_user_sessions.
 */
export async function createUserSession(params: CreateSessionParams): Promise<UserSessionRecord> {
  const { baseUrl, token } = getDirectusConfig();
  const sessionId = crypto.randomUUID();
  const { deviceName, deviceType, browserName } = parseUserAgent(params.userAgent);

  const nowMs = Date.now();
  const expiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days default
  const createdAtPH = new Date(nowMs + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const expiresAtPH = new Date(expiresMs + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

  const payload: Partial<UserSessionRecord> = {
    session_id: sessionId,
    user_id: Number(params.userId),
    deployment_id: params.deploymentId || "default",
    device_name: deviceName,
    device_type: deviceType,
    browser_name: browserName,
    ip_address: params.ipAddress || null,
    location_label: params.locationLabel || null,
    user_agent: params.userAgent || null,
    created_at: createdAtPH,
    last_activity_at: createdAtPH,
    expires_at: expiresAtPH,
    revoked_at: null,
    revocation_reason: null,
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}/items/vs_user_sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to create session in vs_user_sessions: HTTP ${res.status} ${errText}`);
  }

  const json = await res.json();
  return json.data as UserSessionRecord;
}

/**
 * Validates whether a session ID is active, unexpired, and unrevoked.
 */
export async function validateUserSession(sessionId: string): Promise<{ valid: boolean; session?: UserSessionRecord }> {
  if (!sessionId) return { valid: false };

  const { baseUrl, token } = getDirectusConfig();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${baseUrl}/items/vs_user_sessions/${sessionId}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) return { valid: false };

    const json = await res.json();
    const session = json.data as UserSessionRecord | undefined;

    if (!session || session.revoked_at) {
      return { valid: false, session };
    }

    const expiresAtMs = new Date(session.expires_at.replace(" ", "T") + "+08:00").getTime();
    if (Date.now() > expiresAtMs) {
      return { valid: false, session };
    }

    return { valid: true, session };
  } catch (err) {
    console.error("[session.repo] validateUserSession error:", err);
    return { valid: false };
  }
}

/**
 * Revokes a single session by session_id.
 */
export async function revokeUserSession(sessionId: string, reason: string = "LOGOUT"): Promise<boolean> {
  if (!sessionId) return false;

  const { baseUrl, token } = getDirectusConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const nowPH = getPHTimeString();

  try {
    const res = await fetch(`${baseUrl}/items/vs_user_sessions/${sessionId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        revoked_at: nowPH,
        revocation_reason: reason,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error(`[session.repo] revokeUserSession (${sessionId}) error:`, err);
    return false;
  }
}

/**
 * Revokes all active sessions for a user EXCEPT the current session.
 */
export async function revokeOtherUserSessions(
  userId: number,
  currentSessionId?: string | null,
  reason: string = "PASSWORD_RESET"
): Promise<number> {
  const { baseUrl, token } = getDirectusConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const queryUrl = `${baseUrl}/items/vs_user_sessions?filter[user_id][_eq]=${userId}&filter[revoked_at][_null]=true`;
    const res = await fetch(queryUrl, { headers: { ...headers, Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return 0;

    const json = await res.json();
    const sessions = (json.data || []) as UserSessionRecord[];
    const nowPH = getPHTimeString();
    let revokedCount = 0;

    for (const session of sessions) {
      if (currentSessionId && session.session_id === currentSessionId) {
        continue;
      }
      await fetch(`${baseUrl}/items/vs_user_sessions/${session.session_id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          revoked_at: nowPH,
          revocation_reason: reason,
        }),
      });
      revokedCount++;
    }

    return revokedCount;
  } catch (err) {
    console.error(`[session.repo] revokeOtherUserSessions for user #${userId} error:`, err);
    return 0;
  }
}

/**
 * Returns all active, unrevoked sessions for a specific user.
 */
export async function getActiveSessionsForUser(userId: number): Promise<UserSessionRecord[]> {
  const { baseUrl, token } = getDirectusConfig();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const queryUrl = `${baseUrl}/items/vs_user_sessions?filter[user_id][_eq]=${userId}&filter[revoked_at][_null]=true&sort=-created_at`;
    const res = await fetch(queryUrl, { headers, cache: "no-store" });
    if (!res.ok) return [];

    const json = await res.json();
    const sessions = (json.data || []) as UserSessionRecord[];
    const nowMs = Date.now();

    // Filter out naturally expired sessions
    return sessions.filter((s) => {
      if (s.revoked_at) return false;
      const expiresMs = new Date(s.expires_at.replace(" ", "T") + "+08:00").getTime();
      return expiresMs > nowMs;
    });
  } catch (err) {
    console.error(`[session.repo] getActiveSessionsForUser (#${userId}) error:`, err);
    return [];
  }
}
