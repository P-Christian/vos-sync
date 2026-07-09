// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createUser } from "@/lib/directus";
import bcrypt from "bcrypt";
import * as jose from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const COOKIE_MAX_AGE_CAP = 60 * 60 * 24 * 7;
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
        }

        const { firstName, lastName, email, password, contact, role } = body;

        // Basic validation
        if (!firstName || !lastName || !email || !password || !contact || !role) {
            return NextResponse.json(
                { ok: false, message: "Missing required fields." },
                { status: 400 }
            );
        }

        // Ensure user doesn't already exist
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return NextResponse.json(
                { ok: false, message: "Email is already registered." },
                { status: 409 }
            );
        }

        // Hash the password
        const saltRounds = 10;
        const hash_password = await bcrypt.hash(password, saltRounds);

        // Map data for Directus vs_user
        const userData = {
            user_fname: firstName,
            user_lname: lastName,
            user_email: email,
            hash_password: hash_password,
            user_contact: contact,
            role: String(role).toUpperCase(),
            // Set defaults to avoid null constraint issues for optional fields if any
            is_blocked: false,
            force_password_reset: false,
            failed_attempts: 0,
            isAdmin: false,
            profile_completion_percent: 0,
            otp_verified: false
        };

        // Create user in Directus
        const newUser = await createUser(userData);

        // Automatically log them in by issuing a JWT
        const secret = new TextEncoder().encode(JWT_SECRET);
        const alg = 'HS256';

        const token = await new jose.SignJWT({ 
            sub: String(newUser.user_id),
            email: newUser.user_email,
            role: newUser.role
        })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        const res = NextResponse.json(
            { ok: true, message: "Account created successfully." },
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

    } catch (err: unknown) {
        console.error("[auth/signup] Signup error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to create account.";
        return NextResponse.json(
            { ok: false, message: errorMessage },
            { status: 500 }
        );
    }
}
