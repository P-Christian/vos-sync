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

    console.log(`[api/auth/logout] Logging out user_id=${userId}`);

    const res = NextResponse.json({ ok: true });

    const hostname = req.nextUrl.hostname;

    // Delete using Next.js cookie helper
    res.cookies.delete(COOKIE_NAME);
    res.cookies.delete({ name: COOKIE_NAME, path: "/" });

    // Explicit Set-Cookie headers for guaranteed browser cookie eviction across custom hosts (e.g. vos-sync-local)
    res.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`);
    if (hostname) {
        res.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Domain=${hostname}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`);
        res.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Domain=.${hostname}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`);
    }

    return res;
}
