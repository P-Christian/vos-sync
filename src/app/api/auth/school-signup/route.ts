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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            token,
            user_fname,
            user_lname,
            user_contact,
            user_email,
            password,
            school_name,
            school_type,
            city_municipality,
            province
        } = body;

        // 1. Basic validation
        if (!user_fname || !user_lname || !user_contact || !user_email || !password || !school_name || !school_type || !city_municipality || !province) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 2. Validate token if present (Invite flow redirecting to signup)
        let invitedSchoolId: number | null = null;
        let inviteTokenId: string | null = null;
        if (token) {
            const tokenUrl = `${DIRECTUS_BASE}/items/vs_invite_token?filter[token][_eq]=${token}`;
            const tokenRes = await fetch(tokenUrl, { headers: getHeaders(), cache: 'no-store' });
            const tokenJson = await tokenRes.json();
            
            if (!tokenRes.ok || !tokenJson.data || tokenJson.data.length === 0) {
                return NextResponse.json({ error: "Invalid invitation token" }, { status: 400 });
            }

            const invite = tokenJson.data[0];
            if (invite.is_used || new Date(invite.expires_at) < new Date()) {
                return NextResponse.json({ error: "Token is expired or already used" }, { status: 400 });
            }
            invitedSchoolId = invite.school_id;
            inviteTokenId = invite.token_id || invite.id;
        }

        // 3. Duplicate User Check
        const existingUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_user?filter[user_email][_eq]=${user_email}`, {
            headers: getHeaders(),
            cache: 'no-store'
        });
        const existingUserJson = await existingUserRes.json();
        const existingUser = existingUserJson.data?.[0];

        if (existingUser) {
            return NextResponse.json({ error: "An account with this email address already exists. Please log in." }, { status: 400 });
        }

        // 4. Duplicate School Check (Only for self-signup since invites link to an existing school)
        if (!token) {
            const schoolCheckUrl = `${DIRECTUS_BASE}/items/vs_school?filter[school_name][_eq]=${encodeURIComponent(school_name)}&filter[city_municipality][_eq]=${encodeURIComponent(city_municipality)}`;
            const schoolCheckRes = await fetch(schoolCheckUrl, { headers: getHeaders(), cache: 'no-store' });
            const schoolCheckJson = await schoolCheckRes.json();
            if (schoolCheckJson.data && schoolCheckJson.data.length > 0) {
                return NextResponse.json({ 
                    error: `A school named "${school_name}" is already registered in "${city_municipality}". If this is your school, please contact VOS-Sync support.` 
                }, { status: 409 });
            }
        }

        // 5. Create or reuse school record
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        let schoolId = invitedSchoolId;

        // Create Admin User
        const roleId = 4; // School Admin
        const createUserRes = await fetch(`${DIRECTUS_BASE}/items/vs_user`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                user_email,
                hash_password: passwordHash,
                user_password: password,
                user_fname,
                user_lname,
                user_contact,
                role_id: roleId,
                role: 'SCH_ADMIN',
                status: 'PENDING_VERIFICATION' // ACTIVE after OTP verification
            })
        });

        const userJson = await createUserRes.json();
        if (!createUserRes.ok) {
            return NextResponse.json({ error: userJson.errors?.[0]?.message || "Failed to create user account." }, { status: 400 });
        }
        const userId = userJson.data.user_id || userJson.data.id;

        // If self-signup, create the new school
        if (!schoolId) {
            // Calculate base completion (10% name, 10% type, 10% email, 5% city, 5% province = 40%)
            const baseCompletion = 40;
            const createSchoolRes = await fetch(`${DIRECTUS_BASE}/items/vs_school`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    school_name,
                    school_type,
                    school_email: user_email,
                    city_municipality,
                    province,
                    school_status: 'Draft',
                    profile_completion_percent: baseCompletion,
                    created_by: userId
                })
            });

            const schoolJson = await createSchoolRes.json();
            if (!createSchoolRes.ok) {
                // Cleanup created user on failure
                await fetch(`${DIRECTUS_BASE}/items/vs_user/${userId}`, { method: 'DELETE', headers: getHeaders() });
                return NextResponse.json({ error: schoolJson.errors?.[0]?.message || "Failed to create school profile." }, { status: 400 });
            }
            schoolId = schoolJson.data.school_id || schoolJson.data.id;
        } else {
            // Update existing school status if registered via invite
            await fetch(`${DIRECTUS_BASE}/items/vs_school/${schoolId}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ school_status: 'Draft' })
            });
        }

        // Link User to School
        await fetch(`${DIRECTUS_BASE}/items/vs_school_admin`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                school_id: schoolId,
                user_id: userId,
                is_active: true
            })
        });

        // 6. Mark invitation token used if invite flow
        if (inviteTokenId) {
            await fetch(`${DIRECTUS_BASE}/items/vs_invite_token/${inviteTokenId}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ is_used: true })
            });
        }

        // 7. Dispatch OTP
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

        await sendOTP(user_email, otpCode);

        return NextResponse.json({
            message: "Registration completed. Verification required.",
            requireOtp: true,
            userId: userId
        });

    } catch (error: unknown) {
        console.error("School signup endpoint error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
