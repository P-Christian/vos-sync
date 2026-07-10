"use server";

import { revalidatePath } from "next/cache";

export async function updateProfessionalSummaryAction(summary: string, profileId?: number, userId?: number) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    let targetProfileId = profileId;
    let method = profileId ? "PATCH" : "POST";

    // Fallback: If frontend didn't pass profileId, check if one already exists for this user to avoid 400 RECORD_NOT_UNIQUE
    if (!targetProfileId && userId) {
        const checkUrl = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_job_seeker_profile?filter[user_id][_eq]=${userId}`;
        const checkRes = await fetch(checkUrl, {
            headers: { "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}` },
            cache: "no-store"
        });
        if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.data && checkData.data.length > 0) {
                targetProfileId = checkData.data[0].profile_id;
                method = "PATCH";
            }
        }
    }

    const url = targetProfileId 
        ? `${NEXT_PUBLIC_API_BASE_URL}/items/vs_job_seeker_profile/${targetProfileId}`
        : `${NEXT_PUBLIC_API_BASE_URL}/items/vs_job_seeker_profile`;
    
    const body = targetProfileId 
        ? { professional_summary: summary }
        : { professional_summary: summary, user_id: userId };

    const res = await fetch(url, {
        method,
        headers: {
            "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        let errDetails = "";
        try {
            errDetails = await res.text();
        } catch {
            errDetails = "Could not parse error details";
        }
        throw new Error(`Failed to update professional summary: HTTP ${res.status} - ${errDetails}`);
    }

    revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
    
    return { success: true };
}

export async function searchMasterSkillsAction(query: string) {
    if (!query || query.length < 2) return [];

    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const url = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_master_skills?filter[skill_name][_icontains]=${encodeURIComponent(query)}&limit=20`;
    
    const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}` },
        cache: "no-store"
    });

    if (!res.ok) {
        console.error("Failed to search master skills", await res.text());
        return [];
    }

    const data = await res.json();
    return data.data || [];
}

export async function saveUserSkillsAction(userId: number, initialSkillIds: number[], newSkillIds: number[]) {
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }
    
    const toAdd = newSkillIds.filter(id => !initialSkillIds.includes(id));
    const toRemove = initialSkillIds.filter(id => !newSkillIds.includes(id));

    // 1. Add new skills directly to junction table
    if (toAdd.length > 0) {
        const addUrl = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user_skills_map`;
        const addPayload = toAdd.map(skillId => ({
            user_id: userId,
            skill_id: skillId
        }));
        
        const addRes = await fetch(addUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(addPayload)
        });

        if (!addRes.ok) {
            let errText = "Unknown error";
            try { errText = await addRes.text(); } catch {}
            throw new Error(`Failed to insert new skills: HTTP ${addRes.status} - ${errText}`);
        }
    }

    // 2. Remove deleted skills
    if (toRemove.length > 0) {
        for (const skillId of toRemove) {
            const delRes = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/items/vs_user_skills_map/${userId},${skillId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}` }
            });
            if (!delRes.ok) {
                let errText = "Unknown error";
                try { errText = await delRes.text(); } catch {}
                console.error(`Failed to delete skill ${skillId}: HTTP ${delRes.status} - ${errText}`);
            }
        }
    }

    revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
    return { success: true };
}
