import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/modules/auth/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim();

    if (!email) {
        return NextResponse.json(
            { ok: false, message: "Email is required." },
            { status: 400 }
        );
    }

    try {
        const { userId } = await requestPasswordReset(email);

        return NextResponse.json(
            { ok: true, message: "If that email is registered, a reset code has been sent.", userId },
            { status: 200 }
        );

    } catch (err: unknown) {
        console.error("[auth/forgot-password] Error:", err);
        
        return NextResponse.json(
            { ok: false, message: "Failed to process reset request." },
            { status: 500 }
        );
    }
}
