// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const COOKIE_NAME = "vos_access_token";
const PROTECTED_PREFIXES = ["/dashboard", "/scm", "/fm", "/hrm", "/bia", "/arf", "/cafeteria", "/vos-sync", "/main-dashboard"];
const PUBLIC_FILE = /\.(.*)$/;
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

function isProtectedPath(pathname: string) {
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
        
        let isAuthorized = true;

        if (pathLower.startsWith("/vos-sync/freelancer") && userRoleName !== "FREELANCER") {
            isAuthorized = false;
        } else if (pathLower.startsWith("/vos-sync/vos-admin") && userRoleName !== "ADMIN") {
            isAuthorized = false;
        } else if (pathLower.startsWith("/vos-sync/client") && userRoleName !== "CLIENT") {
            isAuthorized = false;
        } else if (pathLower.startsWith("/vos-sync/school-admin") && userRoleName !== "SCHOOL_ADMIN") {
            isAuthorized = false;
        }

        if (!isAuthorized) {
            console.warn(`[Middleware] Unauthorized access detected for role_name: ${userRoleName || 'UNKNOWN'} to path: ${pathname}.`);
            return redirectToLogin(req);
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
    return NextResponse.redirect(url);
}

export const config = {
    matcher: ["/:path*"],
};
