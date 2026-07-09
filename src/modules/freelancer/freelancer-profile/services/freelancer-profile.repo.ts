// src/modules/freelancer/freelancer-profile/services/freelancer-profile.repo.ts

export async function fetchFreelancerProfileFromDirectus(email: string) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=*,job_seeker_profile.*,work_experience.*,education.*,certifications.*,skills.*,skills.skill_id.*`;
    
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
            "Content-Type": "application/json"
        },
        cache: "no-store"
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch full user from Directus: HTTP ${res.status}`);
    }

    const json = await res.json();
    const data = json.data;
    
    if (Array.isArray(data) && data.length > 0) {
        return data[0];
    }
    
    return null;
}
