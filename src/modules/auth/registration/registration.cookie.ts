import { NextResponse } from "next/server";
import { REGISTRATION_CONSTANTS } from "./registration.config";

/**
 * The registration cookie is only a server-side lookup handle. It is never a
 * bearer credential and must not be widened to the application root path.
 */
export const REGISTRATION_CHALLENGE_COOKIE_NAME = "vos_registration_challenge";
export const REGISTRATION_CHALLENGE_COOKIE_PATH = "/api/auth/registration";

export interface RegistrationChallengeCookieOptions {
  name: typeof REGISTRATION_CHALLENGE_COOKIE_NAME;
  httpOnly: true;
  sameSite: "strict";
  secure: boolean;
  path: typeof REGISTRATION_CHALLENGE_COOKIE_PATH;
  maxAge: number;
}

export function getRegistrationChallengeCookieOptions(
  maxAgeMs = REGISTRATION_CONSTANTS.CHALLENGE_LIFETIME_MS
): RegistrationChallengeCookieOptions {
  const safeMaxAgeMs = Number.isFinite(maxAgeMs)
    ? Math.max(0, maxAgeMs)
    : 0;

  return {
    name: REGISTRATION_CHALLENGE_COOKIE_NAME,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: REGISTRATION_CHALLENGE_COOKIE_PATH,
    maxAge: Math.ceil(safeMaxAgeMs / 1000),
  };
}

export function setRegistrationChallengeCookie(
  response: NextResponse,
  challengeId: string,
  maxAgeMs = REGISTRATION_CONSTANTS.CHALLENGE_LIFETIME_MS
): NextResponse {
  response.cookies.set({
    ...getRegistrationChallengeCookieOptions(maxAgeMs),
    value: challengeId,
  });
  return response;
}

export function clearRegistrationChallengeCookie(
  response: NextResponse
): NextResponse {
  response.cookies.set({
    ...getRegistrationChallengeCookieOptions(0),
    value: "",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
