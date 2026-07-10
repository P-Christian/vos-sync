// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/modules/auth/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const COOKIE_MAX_AGE_CAP = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);

    try {
        const { newUser, token, role_id } = await registerUser(body);

        const res = NextResponse.json(
            { 
                ok: true, 
                message: "Signup successful.", 
                user: newUser,
                role_id
            },
            { status: 201 }
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

    } catch (err: any) {
        console.error("[auth/signup] Signup error:", err);
        
        const errorMessage = err.message || "An unexpected error occurred.";
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
