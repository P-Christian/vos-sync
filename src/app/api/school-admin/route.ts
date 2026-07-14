import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";

async function verifyAdminAPI() {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
        return true;
    }
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    if (!token) return false;
    try {
        const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";
        const secret = new TextEncoder().encode(JWT_SECRET);
        await jose.jwtVerify(token, secret);
        // Note: Check for payload.role === 'Admin' here in production
        return true;
    } catch (e) {
        return false;
    }
}

export async function GET(req: NextRequest) {
    const isAdmin = await verifyAdminAPI();
    
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
    }

    return NextResponse.json({
        message: "Welcome to the School Admin API",
        data: {
            status: "online",
            post_graduates: 0,
            tasks: 0
        }
    });
}
