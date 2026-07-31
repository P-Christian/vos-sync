// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/modules/auth/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const COOKIE_MAX_AGE_CAP = 60 * 60 * 24 * 7; // 7 days cap

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);

    const email = String(body?.email ?? "").trim();
    const hashPassword = String(body?.hashPassword ?? body?.password ?? "").trim();

    try {
        const { token, role_id, role, role_name } = await loginUser(email, hashPassword);

        console.log(`[api/auth/login] Login success for ${email}: role_id=${role_id}, role=${role}, role_name=${role_name}`);

        const res = NextResponse.json(
            { ok: true, message: "Login successful.", role_id, role, role_name },
            { headers: { "Cache-Control": "no-store" } }
        );

        const isHttps = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";

        res.cookies.set({
            name: COOKIE_NAME,
            value: token,
            httpOnly: true,
            sameSite: "lax",
            secure: isHttps,
            path: "/",
            maxAge: COOKIE_MAX_AGE_CAP,
        });

        return res;

    } catch (err: unknown) {
        console.error("[auth/login] Login error:", err);
        
        const errorMessage = err instanceof Error ? err.message : "Server is down, please contact Administrator.";
        const isClientError = errorMessage.includes("Credentials invalid") || 
                              errorMessage.includes("Account is blocked") || 
                              errorMessage.includes("Account is locked") || 
                              errorMessage.includes("Account locked") || 
                              errorMessage.includes("required");
        const status = isClientError ? 400 : 500;

        return NextResponse.json(
            { ok: false, message: errorMessage },
            { status }
        );
    }
}
