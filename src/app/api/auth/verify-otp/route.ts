import { NextRequest, NextResponse } from "next/server";
import { confirmOTP } from "@/modules/auth/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const COOKIE_MAX_AGE_CAP = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);

    const userId = body?.userId;
    const code = body?.code;

    if (!userId || !code) {
        return NextResponse.json(
            { ok: false, message: "User ID and OTP code are required." },
            { status: 400 }
        );
    }

    try {
        const { token, role_id } = await confirmOTP(userId, code);

        const res = NextResponse.json(
            { 
                ok: true, 
                message: "OTP verified successfully.", 
                role_id
            },
            { status: 200 }
        );

        res.cookies.set({
            name: COOKIE_NAME,
            value: token,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: COOKIE_MAX_AGE_CAP,
        });

        return res;

    } catch (err: unknown) {
        console.error("[auth/verify-otp] Error:", err);
        
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        const status = errorMessage.includes("Invalid") || errorMessage.includes("expired") ? 400 : 500;

        return NextResponse.json(
            { ok: false, message: errorMessage },
            { status }
        );
    }
}
