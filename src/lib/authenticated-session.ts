import * as jose from "jose";
import { cookies } from "next/headers";
import {
  AccountAuthenticationState,
  canAuthenticate,
  getAccountAuthenticationState,
} from "@/lib/status-validator";
import { getJwtVerificationSecret } from "@/modules/auth/registration/registration.session";

export interface AuthenticatedSession {
  token: string;
  payload: jose.JWTPayload;
  user: AccountAuthenticationState;
  userId: string | number;
  roleId: number | null;
  roleName: string;
}

function normalizeUserId(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    return /^\d+$/u.test(trimmed) ? Number(trimmed) : trimmed;
  }
  return null;
}

/**
 * Return the access token from a request without accepting arbitrary JWT
 * payloads. The token is only useful after authenticateAccessToken verifies
 * its signature and re-reads the current account state.
 */
export function getAccessTokenFromRequest(
  request: Request & { cookies?: { get: (name: string) => { value?: string } | undefined } },
): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/iu);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  const cookieToken = request.cookies?.get("vos_access_token")?.value;
  return cookieToken?.trim() || null;
}

/**
 * Verify a signed access token and require the account to remain active.
 * JWT claims are treated as a locator only; authorization uses the current
 * Directus account row returned by getAccountAuthenticationState.
 */
export async function authenticateAccessToken(
  token: string | null | undefined,
): Promise<AuthenticatedSession | null> {
  if (!token?.trim()) return null;

  try {
    const { payload } = await jose.jwtVerify(token.trim(), getJwtVerificationSecret());
    const userId = normalizeUserId(payload.sub ?? payload.user_id ?? payload.id);
    if (userId === null) return null;

    const user = await getAccountAuthenticationState(userId);
    if (!user || !canAuthenticate(user)) return null;

    const roleIdValue = Number(user.role_id ?? payload.role_id);
    const roleId = Number.isSafeInteger(roleIdValue) && roleIdValue > 0 ? roleIdValue : null;
    const roleName = String(
      user.role_name ?? user.role ?? payload.role_name ?? payload.role ?? "",
    ).toUpperCase();

    return {
      token: token.trim(),
      payload,
      user,
      userId,
      roleId,
      roleName,
    };
  } catch {
    return null;
  }
}

export async function authenticateRequest(
  request: Request & { cookies?: { get: (name: string) => { value?: string } | undefined } },
): Promise<AuthenticatedSession | null> {
  return authenticateAccessToken(getAccessTokenFromRequest(request));
}

export async function authenticateCookieSession(): Promise<AuthenticatedSession | null> {
  const cookieStore = await cookies();
  return authenticateAccessToken(cookieStore.get("vos_access_token")?.value);
}

export function hasRole(
  session: AuthenticatedSession,
  roleIds: readonly number[],
  roleNames: readonly string[],
): boolean {
  const roleName = session.roleName.toUpperCase();
  return (
    (session.roleId !== null && roleIds.includes(session.roleId)) ||
    roleNames.some((name) => roleName === name.toUpperCase())
  );
}

export function isAdministratorSession(session: AuthenticatedSession): boolean {
  return hasRole(session, [3], ["ADMIN", "ADMINISTRATOR"]);
}

export function isClientSession(session: AuthenticatedSession): boolean {
  return hasRole(session, [2], ["CLIENT", "EMPLOYER"]);
}

export function isFreelancerSession(session: AuthenticatedSession): boolean {
  return hasRole(session, [1], ["FREELANCER"]);
}

