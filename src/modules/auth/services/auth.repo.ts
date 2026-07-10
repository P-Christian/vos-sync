// src/modules/auth/services/auth.repo.ts

export async function getUserByEmail(email: string) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user?filter[user_email][_eq]=${encodeURIComponent(email)}`;
    
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
            "Content-Type": "application/json"
        },
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch user from Directus: HTTP ${res.status}`);
    }

    const json = await res.json();
    const data = json.data;
    
    if (Array.isArray(data) && data.length > 0) {
        return data[0]; // return the first matched user
    }
    
    return null;
}

export async function createUser(userData: Record<string, unknown>) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(userData),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create user in Directus: HTTP ${res.status} - ${text}`);
    }

    const json = await res.json();
    return json.data;
}

export async function getUserById(userId: string | number) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user/${userId}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
            "Content-Type": "application/json"
        },
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch user by ID: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
}

export async function updateUserOTP(userId: string | number, otpCode: string, otpExpiry: string, otpSentAt: string) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user/${userId}`;

    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            otp_code: otpCode,
            otp_expiry: otpExpiry,
            otp_sent_at: otpSentAt,
            otp_verified: 0
        }),
    });

    if (!res.ok) {
        throw new Error(`Failed to update OTP in Directus: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
}

export async function markOTPVerified(userId: string | number) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user/${userId}`;

    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            otp_verified: 1
        }),
    });

    if (!res.ok) {
        throw new Error(`Failed to mark OTP verified in Directus: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
}
