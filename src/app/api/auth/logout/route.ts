// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createAuditRecordRepo } from "@/modules/vos-admin/audit-trail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_super_secret_key_for_development"
);

export async function POST(req: NextRequest) {
    const token = req.cookies.get(COOKIE_NAME)?.value || req.headers.get("authorization")?.replace("Bearer ", "");
    let userId: number | null = null;

    if (token) {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            userId = Number(payload.sub || payload.user_id || payload.id);
        } catch {
            // Ignore invalid token on logout
        }
    }

    createAuditRecordRepo({
        event_type: "USER_LOGOUT",
        event_category: "AUTHENTICATION",
        action: "LOGOUT",
        status: "SUCCESS",
        actor_type: "USER",
        actor_user_id: userId,
        reason: "User logged out",
    });

    const res = NextResponse.json({ ok: true });

    res.cookies.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });

    return res;
}
