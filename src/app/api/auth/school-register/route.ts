import { NextResponse } from 'next/server';
import { sendOTP } from '@/modules/auth/services/email.service';
import bcrypt from 'bcrypt';

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders() {
    const h: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    if (DIRECTUS_TOKEN) h['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ valid: false, reason: "Missing token" }, { status: 400 });
        }

        const url = `${DIRECTUS_BASE}/items/vs_invite_token?filter[token][_eq]=${token}&fields=*,school_id.*`;
        const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
        const json = await res.json();

        if (!res.ok || !json.data || json.data.length === 0) {
            return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
        }

        const invite = json.data[0];

        if (invite.is_used) {
            return NextResponse.json({ valid: false, reason: "used" }, { status: 400 });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ valid: false, reason: "expired" }, { status: 400 });
        }

        return NextResponse.json({
            valid: true,
            invited_email: invite.invited_email,
            school_id: invite.school_id?.school_id || invite.school_id,
            school_name: invite.school_id?.school_name
        });

    } catch (error) {
        console.error("School register GET error:", error);
        return NextResponse.json({ valid: false, reason: "server_error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, user_fname, user_lname, user_contact, password } = body;

        if (!token || !user_fname || !user_lname || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Validate Token
        const tokenUrl = `${DIRECTUS_BASE}/items/vs_invite_token?filter[token][_eq]=${token}`;
        const tokenRes = await fetch(tokenUrl, { headers: getHeaders() });
        const tokenJson = await tokenRes.json();
        
        if (!tokenRes.ok || !tokenJson.data || tokenJson.data.length === 0) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 });
        }

        const invite = tokenJson.data[0];

        if (invite.is_used || new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ error: "Token is expired or already used" }, { status: 400 });
        }

        const schoolId = invite.school_id;
        const invitedEmail = invite.invited_email;

        // 2. Check existing user
        const existingUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_user?filter[user_email][_eq]=${invitedEmail}`, {
            headers: getHeaders()
        });
        const existingUserJson = await existingUserRes.json();
        const existingUser = existingUserJson.data?.[0];

        const roleId = 4; // School Admin
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        let userId;

        if (existingUser) {
            if (existingUser.user_status === 'Active') {
                return NextResponse.json({ error: "Account already exists and is active. Please log in." }, { status: 400 });
            }
            
            // If Pending, update the existing record instead of failing
            const updateUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_user/${existingUser.user_id || existingUser.id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    hash_password: passwordHash,
                    user_password: password,
                    user_fname,
                    user_lname,
                    user_contact,
                })
            });
            if (!updateUserRes.ok) {
                return NextResponse.json({ error: "Failed to update existing pending user." }, { status: 400 });
            }
            userId = existingUser.user_id || existingUser.id;
        } else {
            const createUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_user`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    user_email: invitedEmail,
                    hash_password: passwordHash,
                    user_password: password,
                    user_fname,
                    user_lname,
                    user_contact,
                    role_id: roleId,
                    role: 'SCH_ADMIN',
                    user_status: 'Pending' // Will be active after OTP
                })
            });

            const userJson = await createUserRes.json();
            if (!createUserRes.ok) {
                return NextResponse.json({ error: userJson.errors?.[0]?.message || "Failed to create user" }, { status: 400 });
            }
            userId = userJson.data.user_id || userJson.data.id;
        }

        // 3. Update vs_school to 'Pending'
        await fetch(`${DIRECTUS_BASE}/items/vs_school/${schoolId}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ school_status: 'Pending' })
        });

        // 4. Create vs_school_admin link (if not exists)
        const checkLink = await fetch(`${DIRECTUS_BASE}/items/vs_school_admin?filter[school_id][_eq]=${schoolId}&filter[user_id][_eq]=${userId}`, { headers: getHeaders() });
        const checkLinkJson = await checkLink.json();
        if (!checkLinkJson.data || checkLinkJson.data.length === 0) {
            await fetch(`${DIRECTUS_BASE}/items/vs_school_admin`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    school_id: schoolId,
                    user_id: userId,
                    is_active: true
                })
            });
        }

        // 5. Mark token as used
        await fetch(`${DIRECTUS_BASE}/items/vs_invite_token/${invite.token_id || invite.id}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ is_used: true })
        });

        // 6. Generate OTP and send email
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const getPHTimeString = (d: Date) => new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
        const now = new Date();
        const expiry = new Date(now.getTime() + 10 * 60 * 1000);
        
        await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                otp_code: otpCode,
                otp_expiry: getPHTimeString(expiry),
                otp_sent_at: getPHTimeString(now),
                otp_verified: 0
            })
        });

        await sendOTP(invitedEmail, otpCode);

        return NextResponse.json({
            message: "User created and school linked.",
            requireOtp: true,
            userId: userId
        });

    } catch (error: any) {
        console.error("School register POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
