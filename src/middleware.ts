// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const COOKIE_NAME = "vos_access_token";
const PROTECTED_PREFIXES = ["/dashboard", "/scm", "/fm", "/hrm", "/bia", "/arf", "/cafeteria", "/vos-sync", "/main-dashboard"];
const PUBLIC_FILE = /\.(.*)$/;
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

function isProtectedPath(pathname: string) {
    const pathLower = pathname.toLowerCase();
    if (pathLower === "/vos-sync/freelancer/jobs" || pathLower.startsWith("/vos-sync/freelancer/jobs/")) {
        return false;
    }
    return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
        return NextResponse.next();
    }

    const { pathname } = req.nextUrl;

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/robots.txt") ||
        pathname.startsWith("/sitemap.xml") ||
        PUBLIC_FILE.test(pathname)
    ) {
        return NextResponse.next();
    }

    if (
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname.startsWith("/api/auth/login") ||
        pathname.startsWith("/api/auth/signup") ||
        pathname.startsWith("/api/auth/logout")
    ) {
        return NextResponse.next();
    }

    if (!isProtectedPath(pathname)) {
        return NextResponse.next();
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
        return redirectToLogin(req);
    }

    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        
        const userRoleName = typeof payload.role_name === 'string' ? payload.role_name.toUpperCase() : "";
        const pathLower = pathname.toLowerCase();
        
        // Exclude suspended page and logout routes from redirection checks
        if (
            pathLower !== "/vos-sync/suspended" && 
            !pathLower.startsWith("/api/auth/logout") && 
            pathLower !== "/logout"
        ) {
            const userId = Number(payload.sub || payload.user_id || payload.id);
            const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
            const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
            const headers: Record<string, string> = { "Accept": "application/json" };
            if (DIRECTUS_TOKEN) headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;

            try {
                const statusRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
                    headers,
                    next: { revalidate: 15 }
                } as RequestInit & { next?: { revalidate: number } });

                if (statusRes.ok) {
                    const statusJson = await statusRes.json();
                    const dbUser = statusJson.data;
                    if (dbUser) {
                        const status = dbUser.status || 'ACTIVE';
                        const sessionEpoch = dbUser.session_epoch ? new Date(dbUser.session_epoch).getTime() : 0;
                        const tokenIat = payload.iat ? payload.iat * 1000 : 0;

                        if (status === 'SUSPENDED' || status === 'BLOCKED' || sessionEpoch > tokenIat) {
                            console.warn(`[Middleware] Account containment active for user #${userId}. Redirecting to suspended page.`);
                            const url = req.nextUrl.clone();
                            url.pathname = "/vos-sync/suspended";
                            return NextResponse.redirect(url);
                        }
                    }
                }
            } catch (fetchErr) {
                console.error("[Middleware] Failed to fetch account status details:", fetchErr);
            }
        }

        let isAuthorized = true;
        const userRoleId = Number(payload.role_id);
        
        if (pathLower.startsWith("/vos-sync/freelancer") && userRoleName !== "FREELANCER" && userRoleId !== 1) {
            isAuthorized = false;
        } else if (pathLower.startsWith("/vos-sync/vos-admin") && userRoleName !== "ADMIN" && userRoleId !== 3) {
            isAuthorized = false;
        } else if (pathLower.startsWith("/vos-sync/client") && userRoleName !== "CLIENT" && userRoleId !== 2) {
            isAuthorized = false;
        } else if (pathLower.startsWith("/vos-sync/school-admin") && userRoleName !== "SCHOOL_ADMIN" && userRoleId !== 4) {
            isAuthorized = false;
        }
 
        if (!isAuthorized) {
            let roleDashboard = "/vos-sync/freelancer/dashboard";
            if (userRoleId === 2 || userRoleName === "CLIENT") {
                roleDashboard = "/vos-sync/client/dashboard";
            } else if (userRoleId === 3 || userRoleName === "ADMIN") {
                roleDashboard = "/vos-sync/vos-admin";
            } else if (userRoleId === 4 || userRoleName === "SCHOOL_ADMIN") {
                roleDashboard = "/vos-sync/school-admin";
            }
            const url = req.nextUrl.clone();
            url.pathname = roleDashboard;
            url.searchParams.delete("next");
            return NextResponse.redirect(url);
        }
 
        const response = NextResponse.next();
        
        // Prevent browser caching (bfcache) so the back button forces a new request to middleware
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        
        return response;
    } catch (err) {
        console.error("[Middleware] JWT verification failed:", err);
        return redirectToLogin(req);
    }
}

function redirectToLogin(req: NextRequest) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    const response = NextResponse.redirect(url);
    const hostname = req.nextUrl.hostname;

    response.cookies.delete(COOKIE_NAME);
    response.cookies.delete({ name: COOKIE_NAME, path: "/" });

    response.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`);
    if (hostname) {
        response.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Domain=${hostname}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`);
    }

    return response;
}

export const config = {
    matcher: ["/:path*"],
};
