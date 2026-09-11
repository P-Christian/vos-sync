import * as jose from "jose";
import { SessionTokenResult } from "./registration.types";
import { getRoleById } from "../services/auth.repo";
import { RegistrationError } from "./registration.errors";
import { canAuthenticate } from "@/lib/status-validator";

interface AuthSessionUser {
  user_id: string | number;
  user_email: string;
  role: string;
  role_id: number;
  role_name?: string;
  user_fname?: string;
  user_lname?: string;
  status?: string | null;
  user_status?: string | null;
  otp_verified?: boolean | number | string | null;
  is_blocked?: boolean | number | string | null;
  lock_until?: string | null;
}

export function getJwtVerificationSecret(): Uint8Array {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    throw new RegistrationError(
      "JWT_SECRET is not configured.",
      "CONFIGURATION_ERROR",
      500
    );
  }

  return new TextEncoder().encode(
    configuredSecret || "default_super_secret_key_for_development"
  );
}

/**
 * Resolves default dashboard destination based on user role
 */
export function resolveRoleDestination(
  role: string,
  roleId?: number
): string {
  const normalizedRole = (role || "").toUpperCase();
  const id = Number(roleId);

  if (id === 1 || normalizedRole === "FREELANCER") {
    return "/vos-sync/freelancer/dashboard";
  }
  if (id === 2 || normalizedRole === "CLIENT" || normalizedRole === "EMPLOYER") {
    return "/vos-sync/client/dashboard";
  }
  if (id === 3 || normalizedRole === "ADMIN") {
    return "/vos-sync/vos-admin";
  }
  if (
    id === 4 ||
    normalizedRole === "SCH_ADMIN" ||
    normalizedRole === "SCHOOL_ADMIN"
  ) {
    return "/vos-sync/school-admin";
  }

  return "/main-dashboard";
}

/**
 * Issues an authenticated JWT session consistent with login
 */
export async function issueAuthSession(
  user: AuthSessionUser
): Promise<SessionTokenResult> {
  if (!canAuthenticate(user)) {
    throw new RegistrationError(
      "Account is not active or verified.",
      "REGISTRATION_RESTRICTED",
      403
    );
  }

  let cleanRoleName = user.role_name || user.role || "";

  try {
    if (!user.role_name && user.role_id) {
      const roleData = await getRoleById(user.role_id);
      if (roleData && roleData.role_name) {
        cleanRoleName = roleData.role_name;
      }
    }
  } catch {
    // Non-blocking fallback to user.role
  }

  const secret = getJwtVerificationSecret();
  const alg = "HS256";

  const claims: Record<string, unknown> = {
    sub: String(user.user_id),
    email: user.user_email,
    role: user.role,
    role_name: cleanRoleName,
    role_id: user.role_id,
  };
  if (user.user_fname) claims.user_fname = user.user_fname;
  if (user.user_lname) claims.user_lname = user.user_lname;

  const token = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const destination = resolveRoleDestination(user.role, user.role_id);

  return {
    token,
    destination,
    user_id: user.user_id,
    role: user.role,
    role_id: user.role_id,
    role_name: cleanRoleName,
  };
}

/**
 * Backwards-compatible name for callers that issue a session after
 * challenge-backed registration provisioning.
 */
export const issueRegistrationSession = issueAuthSession;
