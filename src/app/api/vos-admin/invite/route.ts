import { NextResponse } from 'next/server';
import { sendSchoolInvite } from '@/modules/auth/services/email.service';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";
const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

async function verifyAdmin(req: Request): Promise<number | null> {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") return 1;
    const cookieStore = await cookies();
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || cookieStore.get("vos_access_token")?.value;
    if (!token) return null;
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        return Number(payload.sub || payload.user_id || payload.id);
    } catch {
        return null;
    }
}

function getHeaders() {
    const h: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    if (DIRECTUS_TOKEN) h['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function POST(req: Request) {
    try {
        const adminId = await verifyAdmin(req);
        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { school_id, invited_email, school_name } = body;

        if (!school_id || !invited_email || !school_name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Generate a UUID token
        const token = crypto.randomUUID();
        
        // Expiry in 72 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 72);

        // Store it in vs_invite_token
        const tokenUrl = `${DIRECTUS_BASE}/items/vs_invite_token`;
        const res = await fetch(tokenUrl, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                token,
                school_id,
                invited_email,
                invited_by: adminId,
                expires_at: expiresAt.toISOString(),
                is_used: false
            })
        });

        if (!res.ok) {
            const errJson = await res.json();
            return NextResponse.json({ error: errJson.errors?.[0]?.message || "Failed to create invite token" }, { status: res.status });
        }

        // Determine invite URL base (fallback to localhost for dev)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/school-register?token=${token}`;

        // Send email
        await sendSchoolInvite(invited_email, school_name, inviteUrl);

        return NextResponse.json({ message: "Invite sent successfully" });

    } catch (error: unknown) {
        console.error("Invite API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
