// src/modules/client/settings/services/client-profile.service.ts

import * as jose from "jose";
import { UserProfile } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";
const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const FIELDS = [
    "user_id",
    "user_email",
    "user_fname",
    "user_mname",
    "user_lname",
    "suffix_name",
    "nickname",
    "user_contact",
    "user_position",
    "user_province",
    "user_city",
    "user_brgy",
    "gender",
    "user_bday",
    "civil_status",
    "profile_image_url",
    "user_image",
    "role",
].join(",");

/**
 * Fetch client user profile from Directus using a verified JWT token.
 * Mirrors the same pattern as getFreelancerProfile.
 */
export async function getClientProfile(token: string): Promise<UserProfile | null> {
    if (!token) return null;

    if (!DIRECTUS_BASE || !DIRECTUS_TOKEN) {
        console.error("[getClientProfile] Directus base URL or static token is not configured.");
        return null;
    }

    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);

        if (!payload.email || typeof payload.email !== "string") {
            return null;
        }

        const url = `${DIRECTUS_BASE}/items/vs_user?filter[user_email][_eq]=${encodeURIComponent(payload.email)}&fields=${FIELDS}&limit=1`;

        const res = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            console.error(`[getClientProfile] Directus fetch failed: HTTP ${res.status}`);
            return null;
        }

        const json = await res.json();
        const data = json?.data;

        if (Array.isArray(data) && data.length > 0) {
            return data[0] as UserProfile;
        }

        return null;
    } catch (err) {
        console.error("[getClientProfile] Failed to verify token or fetch client profile:", err);
        return null;
    }
}
