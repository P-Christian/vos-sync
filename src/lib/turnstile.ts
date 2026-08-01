export interface TurnstileVerificationResult {
  success: boolean;
  message?: string;
  errorCodes?: string[];
}

/**
 * Server-side helper to verify Cloudflare Turnstile token
 * against https://challenges.cloudflare.com/turnstile/v0/siteverify
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET || process.env.NEXT_PUBLIC_TURNSTILE_SECRET;
  const isDevOrDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" || process.env.NODE_ENV === "development";

  // If secret key is not configured in env
  if (!secretKey) {
    if (isDevOrDisabled) {
      console.warn("[TURNSTILE] TURNSTILE_SECRET is not configured in env. Bypassing Turnstile check for development.");
      return { success: true };
    }
    return {
      success: false,
      message: "CAPTCHA secret key is not configured on the server.",
    };
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    if (isDevOrDisabled) {
      console.warn("[TURNSTILE] Token missing in development mode. Allowing dev bypass.");
      return { success: true };
    }
    return {
      success: false,
      message: "Security CAPTCHA verification is required.",
    };
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", secretKey);
    body.append("response", token.trim());
    if (remoteIp) {
      body.append("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        success: false,
        message: "Cloudflare Turnstile verification service error.",
      };
    }

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      message: "CAPTCHA verification failed. Please complete the security check and try again.",
      errorCodes: data["error-codes"],
    };
  } catch (err: unknown) {
    console.error("[TURNSTILE ERROR]", err);
    return {
      success: false,
      message: "Failed to verify CAPTCHA with Cloudflare. Please try again later.",
    };
  }
}
