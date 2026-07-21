import { NextRequest, NextResponse } from "next/server";
import { confirmPasswordReset } from "@/modules/auth/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    
    const userId = body?.userId;
    const otp = body?.otp;
    const newPassword = body?.newPassword;

    if (!userId || !otp || !newPassword) {
        return NextResponse.json(
            { ok: false, message: "User ID, OTP code, and new password are required." },
            { status: 400 }
        );
    }

    try {
        await confirmPasswordReset(userId, otp, newPassword);

        return NextResponse.json(
            { ok: true, message: "Password updated successfully." },
            { status: 200 }
        );

    } catch (err: unknown) {
        console.error("[auth/reset-password] Error:", err);
        
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        const status = errorMessage.includes("Invalid") || errorMessage.includes("expired") || errorMessage.includes("not found") ? 400 : 500;

        return NextResponse.json(
            { ok: false, message: errorMessage },
            { status }
        );
    }
}
