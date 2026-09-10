export type TurnstileFailureReason =
  | "CONFIGURATION_ERROR"
  | "TOKEN_REQUIRED"
  | "SERVICE_ERROR"
  | "VERIFICATION_FAILED";

export interface TurnstileVerificationResult {
  success: boolean;
  message?: string;
  errorCodes?: string[];
  /** Stable machine-readable reason; optional for backwards compatibility. */
  failureReason?: TurnstileFailureReason;
}

/**
 * Server-side helper to verify Cloudflare Turnstile token
 * against https://challenges.cloudflare.com/turnstile/v0/siteverify
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  // This value must remain server-only. Never fall back to a
  // NEXT_PUBLIC_-prefixed environment variable.
  const secretKey = process.env.TURNSTILE_SECRET?.trim();

  // If secret key is not configured in env
  if (!secretKey) {
    return {
      success: false,
      message: "CAPTCHA secret key is not configured on the server.",
      failureReason: "CONFIGURATION_ERROR",
    };
  }

  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!normalizedToken) {
    return {
      success: false,
      message: "Security CAPTCHA verification is required.",
      failureReason: "TOKEN_REQUIRED",
    };
  }

  // Turnstile tokens are opaque and short-lived. Reject unbounded input before
  // making a network request; the registration schemas apply the same limit
  // for JSON route bodies.
  if (normalizedToken.length > 4096) {
    return {
      success: false,
      message: "CAPTCHA verification failed. Please try again.",
      failureReason: "VERIFICATION_FAILED",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const body = new URLSearchParams();
    body.append("secret", secretKey);
    body.append("response", normalizedToken);
    const normalizedRemoteIp = remoteIp?.trim();
    if (normalizedRemoteIp) {
      body.append("remoteip", normalizedRemoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        success: false,
        message: "Cloudflare Turnstile verification service error.",
        failureReason: "SERVICE_ERROR",
      };
    }

    const data = (await res.json()) as {
      success?: unknown;
      "error-codes"?: string[];
    };

    if (data?.success === true) {
      return { success: true };
    }

    return {
      success: false,
      message: "CAPTCHA verification failed. Please complete the security check and try again.",
      errorCodes: data["error-codes"],
      failureReason: "VERIFICATION_FAILED",
    };
  } catch (err: unknown) {
    // Keep provider/network details out of logs; the caller receives only the
    // stable failure message below.
    console.error("[TURNSTILE ERROR]", {
      error: err instanceof Error ? err.name : "UNKNOWN_ERROR",
    });
    return {
      success: false,
      message: "Failed to verify CAPTCHA with Cloudflare. Please try again later.",
      failureReason: "SERVICE_ERROR",
    };
  } finally {
    clearTimeout(timeout);
  }
}
