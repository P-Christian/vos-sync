import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";
import { REGISTRATION_CHALLENGE_COOKIE_NAME } from "./registration.cookie";
import { isRegistrationV2Enabled } from "./registration.config";
import { RegistrationError } from "./registration.errors";

export const REGISTRATION_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

export const MAX_REGISTRATION_REQUEST_BYTES = 64 * 1024;

export function registrationJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: REGISTRATION_NO_STORE_HEADERS,
  });
}

export function requireRegistrationV2(): NextResponse | null {
  if (isRegistrationV2Enabled()) return null;

  return registrationJson(
    {
      ok: false,
      code: "CONFIGURATION_ERROR",
      message: "Registration is not enabled.",
    },
    503
  );
}

export function getChallengeId(request: NextRequest): string {
  const challengeId = request.cookies.get(
    REGISTRATION_CHALLENGE_COOKIE_NAME
  )?.value;
  if (!challengeId) {
    throw new RegistrationError(
      "Registration challenge cookie is missing.",
      "CHALLENGE_NOT_FOUND",
      401
    );
  }
  return challengeId;
}

export async function parseRegistrationJson<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = MAX_REGISTRATION_REQUEST_BYTES
): Promise<T> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const bytes = Number(declaredLength);
    if (Number.isFinite(bytes) && bytes > maxBytes) {
      throw new RegistrationError(
        "Registration request body is too large.",
        "INVALID_REQUEST",
        413
      );
    }
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    throw new RegistrationError(
      "Registration request body is too large.",
      "INVALID_REQUEST",
      413
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    throw new RegistrationError(
      "Request body must be valid JSON.",
      "INVALID_REQUEST",
      400
    );
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new RegistrationError(
      parsed.error.issues[0]?.message ?? "Invalid registration request.",
      "INVALID_REQUEST",
      400
    );
  }
  return parsed.data;
}

export function handleRegistrationRouteError(error: unknown): NextResponse {
  if (error instanceof RegistrationError) {
    return registrationJson(error.toJSON(), error.statusCode);
  }

  console.error("[registration-route] Unexpected error", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return registrationJson(
    {
      ok: false,
      code: "PROVISIONING_FAILED",
      message: "Registration request could not be completed.",
    },
    500
  );
}
