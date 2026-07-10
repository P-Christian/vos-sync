// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/modules/auth/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);

    try {
        const { requireOtp, userId } = await registerUser(body);

        return NextResponse.json(
            { 
                ok: true, 
                message: "Signup successful. OTP required.", 
                requireOtp,
                userId
            },
            { status: 201 }
        );

    } catch (err: unknown) {
        console.error("[auth/signup] Signup error:", err);
        
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
        let status = 500;
        
        if (errorMessage.includes("already registered")) {
            status = 409;
        } else if (errorMessage.includes("Missing required fields")) {
            status = 400;
        }

        return NextResponse.json(
            { ok: false, message: errorMessage },
            { status }
        );
    }
}
