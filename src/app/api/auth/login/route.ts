// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/directus";
import bcrypt from "bcrypt";
import * as jose from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const COOKIE_MAX_AGE_CAP = 60 * 60 * 24 * 7; // 7 days cap
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);

    const email = String(body?.email ?? "").trim();
    const hashPassword = String(body?.hashPassword ?? body?.password ?? "").trim();

    if (!email || !hashPassword) {
        return NextResponse.json(
            { ok: false, message: 'Both "email" and "password" are required.' },
            { status: 400 }
        );
    }

    try {
        // Fetch user from Directus
        const user = await getUserByEmail(email);
        
        if (!user) {
            return NextResponse.json(
                { ok: false, message: "Credentials invalid." },
                { status: 401 }
            );
        }

        // Compare password
        const isValid = await bcrypt.compare(hashPassword, user.hash_password);
        
        if (!isValid) {
            return NextResponse.json(
                { ok: false, message: "Credentials invalid." },
                { status: 401 }
            );
        }

        // Generate JWT
        const secret = new TextEncoder().encode(JWT_SECRET);
        const alg = 'HS256';

        const token = await new jose.SignJWT({ 
            sub: String(user.user_id),
            email: user.user_email,
            role: user.role
        })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        const res = NextResponse.json(
            { ok: true, message: "Login successful." },
            { headers: { "Cache-Control": "no-store" } }
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
        console.error("[auth/login] Login error:", err);
        return NextResponse.json(
            { ok: false, message: "Server is down, please contact Administrator." },
            { status: 500 }
        );
    }
}
