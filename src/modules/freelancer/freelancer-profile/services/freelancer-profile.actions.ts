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
        // Query the actual IDs of the rows to delete
        const filterUrl = `${NEXT_PUBLIC_API_BASE_URL}/items/vs_user_skills_map?filter[user_id][_eq]=${userId}&filter[skill_id][_in]=${toRemove.join(',')}&fields=id`;
        const filterRes = await fetch(filterUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}` }
        });

        if (filterRes.ok) {
            const filterData = await filterRes.json();
            const idsToDelete = filterData.data?.map((row: any) => row.id) || [];

            if (idsToDelete.length > 0) {
                // Bulk delete the mapped IDs
                const delRes = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/items/vs_user_skills_map`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(idsToDelete)
                });
                
                if (!delRes.ok) {
                    let errText = "Unknown error";
                    try { errText = await delRes.text(); } catch {}
                    console.error(`Failed to bulk delete skills: HTTP ${delRes.status} - ${errText}`);
                }
            }
        }
    }

    revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
    return { success: true };
}

export async function addWorkExperienceAction(userId: number, payload: any) {
    const { addWorkExperienceService } = await import("./freelancer-profile.service");
    
    try {
        await addWorkExperienceService(userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("addWorkExperienceAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function updateWorkExperienceAction(id: number, userId: number, payload: any) {
    const { updateWorkExperienceService } = await import("./freelancer-profile.service");
    
    try {
        await updateWorkExperienceService(id, userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("updateWorkExperienceAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function deleteWorkExperienceAction(id: number, userId: number) {
    const { deleteWorkExperienceService } = await import("./freelancer-profile.service");
    
    try {
        await deleteWorkExperienceService(id, userId);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("deleteWorkExperienceAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function uploadMediaAction(formData: FormData) {
    const file = formData.get("file");
    if (!file) return { success: false, error: "No file provided" };
    
    const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
    
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        return { success: false, error: "Directus API URL or Static Token is not configured." };
    }
    
    const url = `${NEXT_PUBLIC_API_BASE_URL}/files`;
    
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${DIRECTUS_STATIC_TOKEN}`
            },
            body: formData,
        });
        
        if (!res.ok) {
            let errText = "Unknown error";
            try { errText = await res.text(); } catch {}
            throw new Error(`Failed to upload media: HTTP ${res.status} - ${errText}`);
        }
        
        const json = await res.json();
        return { success: true, url: json.data.id, id: json.data.id };
    } catch (err: any) {
        console.error("uploadMediaAction Error:", err);
        return { success: false, error: err.message };
    }
}
