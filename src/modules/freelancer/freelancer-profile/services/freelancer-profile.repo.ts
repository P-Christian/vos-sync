// src/modules/freelancer/freelancer-profile/services/freelancer-profile.repo.ts

export async function fetchFreelancerProfileFromDirectus(email: string) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=*,job_seeker_profile.*,vs_job_seeker_profile.*,work_experience.*,education.*,certifications.*,skills.*,skills.skill_id.*,vs_user_skills_map.*,vs_user_skills_map.skill_id.*`;
    
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
        const user = data[0];
        
        // Handle Directus relation alias mapping if it uses the raw table name
        if (user.vs_job_seeker_profile && !user.job_seeker_profile) {
            user.job_seeker_profile = user.vs_job_seeker_profile;
        }

        if (user.vs_user_skills_map && (!user.skills || user.skills.length === 0)) {
            user.skills = user.vs_user_skills_map;
        }

        // Fix skill mapping for Directus response format
        // Directus returns the expanded object under the foreign key field name (e.g. `skill_id: { skill_name: "..." }`)
        // The UI expects `skill: { skill_name: "..." }`
        if (user.skills && Array.isArray(user.skills)) {
            user.skills = user.skills.map((s: any) => ({
                ...s,
                skill: s.skill || s.skill_id
            }));
        }

        // Fallback: If Directus didn't return the relational data, fetch it explicitly
        if (!user.job_seeker_profile || user.job_seeker_profile.length === 0) {
            const profileUrl = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_job_seeker_profile?filter[user_id][_eq]=${user.user_id}`;
            try {
                const profileRes = await fetch(profileUrl, {
                    headers: {
                        "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    cache: "no-store"
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    if (profileData.data && profileData.data.length > 0) {
                        user.job_seeker_profile = profileData.data;
                    }
                }
            } catch (err) {
                console.error("Failed to fallback fetch job seeker profile", err);
            }
        }

        // Fallback: If Directus didn't return the skills relational data, fetch it explicitly
        if (!user.skills || user.skills.length === 0) {
            const skillsUrl = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user_skills_map?filter[user_id][_eq]=${user.user_id}&fields=*,skill_id.*`;
            try {
                const skillsRes = await fetch(skillsUrl, {
                    headers: {
                        "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    cache: "no-store"
                });
                if (skillsRes.ok) {
                    const skillsData = await skillsRes.json();
                    if (skillsData.data && skillsData.data.length > 0) {
                        user.skills = skillsData.data.map((s: any) => ({
                            ...s,
                            skill: s.skill || s.skill_id
                        }));
                    }
                }
            } catch (err) {
                console.error("Failed to fallback fetch user skills", err);
            }
        }

        return user;
    }
    
    return null;
}
