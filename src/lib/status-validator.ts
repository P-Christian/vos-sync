// src/lib/status-validator.ts

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || ""
).replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export interface AccountAuthenticationState {
  user_id: string | number;
  user_email?: string;
  role?: string;
  role_id?: number;
  role_name?: string;
  user_fname?: string;
  user_lname?: string;
  status?: string | null;
  user_status?: string | null;
  otp_verified?: boolean | number | string | null;
  is_blocked?: boolean | number | string | null;
  lock_until?: string | null;
  session_epoch?: string | null;
}

function isTruthyDatabaseFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isMissingDatabaseFlag(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** One shared, fail-closed predicate for every JWT issuance/request gate. */
export function canAuthenticate(
  user: AccountAuthenticationState | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!user) {
    return false;
  }

  // Challenge-backed registration writes `status`; accounts created by the
  // legacy registration/admin flows use `user_status`. Prefer the canonical
  // field when present, but retain the legacy field as a compatibility source.
  const canonicalStatus = String(user.status ?? "").trim();
  const legacyStatus = String(user.user_status ?? "").trim();
  const accountStatus = (canonicalStatus || legacyStatus).toUpperCase();
  if (accountStatus !== "ACTIVE") {
    return false;
  }
  // Legacy admin-created accounts predate OTP enforcement and have no value
  // for otp_verified. Old self-registration still wrote an explicit 0 while
  // verification was pending, so only an absent legacy flag is compatible;
  // explicit false/0 remains denied. Refactor-era `status` rows always require
  // an affirmative OTP flag.
  const otpVerified = isTruthyDatabaseFlag(user.otp_verified);
  const legacyOtpNotApplicable =
    !canonicalStatus && isMissingDatabaseFlag(user.otp_verified);
  if (
    (!otpVerified && !legacyOtpNotApplicable) ||
    isTruthyDatabaseFlag(user.is_blocked)
  ) {
    return false;
  }
  if (user.lock_until) {
    const lockUntilMs = Date.parse(user.lock_until);
    if (!Number.isFinite(lockUntilMs) || lockUntilMs > nowMs) return false;
  }
  return true;
}

export async function getAccountAuthenticationState(
  userId: string | number
): Promise<AccountAuthenticationState | null> {
  if (!DIRECTUS_BASE || !DIRECTUS_TOKEN) return null;
  try {
    const fields = [
      "user_id",
      "user_email",
      "role",
      "role_id",
      "user_fname",
      "user_lname",
      "status",
      "user_status",
      "otp_verified",
      "is_blocked",
      "lock_until",
      "session_epoch",
    ].join(",");
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_user/${encodeURIComponent(String(userId))}?fields=${fields}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: AccountAuthenticationState };
    return json.data ?? null;
  } catch {
    return null;
  }
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

/**
 * Checks if the user's associated company is approved (vs_company.verification_status === "VERIFIED").
 * Non-verified companies are restricted from posting jobs, browsing candidate profiles, or sending candidate messages.
 */
export async function checkCompanyVerificationStatus(userId: number): Promise<{
  isVerified: boolean;
  verification_status: string;
  companyId: number | null;
}> {
  try {
    const linkUrl = `${DIRECTUS_BASE}/items/vs_company_user?filter[user_id][_eq]=${userId}&fields=company_id&limit=1`;
    const linkRes = await fetch(linkUrl, { headers: getHeaders(), next: { revalidate: 10 } });
    if (!linkRes.ok) return { isVerified: false, verification_status: "DRAFT", companyId: null };

    const linkJson = await linkRes.json();
    const link = linkJson.data?.[0];
    if (!link?.company_id) return { isVerified: false, verification_status: "DRAFT", companyId: null };

    const companyRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_company/${link.company_id}?fields=company_id,verification_status`,
      { headers: getHeaders(), next: { revalidate: 10 } }
    );
    if (!companyRes.ok) return { isVerified: false, verification_status: "DRAFT", companyId: link.company_id };

    const companyJson = await companyRes.json();
    const status = String(companyJson.data?.verification_status ?? "DRAFT").toUpperCase();
    return {
      isVerified: status === "VERIFIED",
      verification_status: status,
      companyId: link.company_id,
    };
  } catch (error) {
    console.error(`[status-validator] Exception checking company verification status for user #${userId}:`, error);
    return { isVerified: false, verification_status: "DRAFT", companyId: null };
  }
}
