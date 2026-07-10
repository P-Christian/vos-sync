// src/app/api/client/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim();
    const otpCode = String(body?.otpCode ?? "").trim();

    if (!email || !otpCode) {
      return NextResponse.json(
        { error: "Both 'email' and 'otpCode' are required." },
        { status: 400 }
      );
    }

    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
      return NextResponse.json({
        success: true,
        message: "OTP verified successfully (Mock fallback)",
        otp_verified: true,
      });
    }

    const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus API base URL is not configured." },
        { status: 500 }
      );
    }

    const getHeaders = () => {
      const h: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (DIRECTUS_TOKEN) {
        h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
      }
      return h;
    };

    // 1. Fetch user from Directus by email
    const lookupUrl = `${DIRECTUS_BASE}/items/vs_user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=*`;
    const lookupRes = await fetch(lookupUrl, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!lookupRes.ok) {
      return NextResponse.json(
        { error: "Failed to look up user." },
        { status: lookupRes.status }
      );
    }

    const lookupJson = await lookupRes.json();
    const users = lookupJson.data;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 404 }
      );
    }

    const user = users[0];

    // 2. Check if OTP is already verified
    if (user.otp_verified == 1 || user.otp_verified === true) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 409 }
      );
    }

    // 3. Check OTP expiry
    // otp_expiry is stored as naive PH datetime (e.g. "2026-07-09 17:06:36")
    // Compare against current PH time using the same offset
    const otpExpiry = user.otp_expiry ? new Date(user.otp_expiry.replace(" ", "T") + "Z") : null;
    const nowPH = new Date(Date.now() + 8 * 60 * 60 * 1000);
    if (!otpExpiry || otpExpiry < nowPH) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // 4. Compare entered OTP with stored OTP (toggle with OTP_HASH_DISABLED=true for plain text)
    const hashedOtp = user.otp_code;
    if (!hashedOtp) {
      return NextResponse.json(
        { error: "No OTP found for this account." },
        { status: 400 }
      );
    }

    const otpHashDisabled = process.env.OTP_HASH_DISABLED === "true";
    const isMatch = otpHashDisabled
      ? otpCode === hashedOtp
      : await bcrypt.compare(otpCode, hashedOtp);

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid OTP code." },
        { status: 400 }
      );
    }

    // 5. Mark user as OTP-verified in Directus and clear OTP fields
    const userId = user.user_id;
    // Record PH timestamp of verification (UTC+8, naive datetime)
    const nowPHStr = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const patchRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        otp_verified: 1,
        otp_verified_at: nowPHStr,
        otp_code: null,
        otp_expiry: null,
      }),
    });

    if (!patchRes.ok) {
      const patchText = await patchRes.text();
      console.error("Failed to update otp_verified in Directus:", patchText);
      return NextResponse.json(
        { error: "OTP verified but failed to update account status." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
      otp_verified: true,
    });
  } catch (error: unknown) {
    console.error("API Route OTP Verification Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

