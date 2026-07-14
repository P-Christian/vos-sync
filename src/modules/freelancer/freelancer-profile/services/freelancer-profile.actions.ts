/* eslint-disable @typescript-eslint/no-explicit-any */
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

export async function addEducationAction(userId: number, payload: any) {
    const { addEducationService } = await import("./freelancer-profile.service");
    
    try {
        await addEducationService(userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("addEducationAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function updateEducationAction(id: number, userId: number, payload: any) {
    const { updateEducationService } = await import("./freelancer-profile.service");
    
    try {
        await updateEducationService(id, userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("updateEducationAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function deleteEducationAction(id: number, userId: number) {
    const { deleteEducationService } = await import("./freelancer-profile.service");
    
    try {
        await deleteEducationService(id, userId);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("deleteEducationAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function addCertificationAction(userId: number, payload: any) {
    const { addCertificationService } = await import("./freelancer-profile.service");
    
    try {
        await addCertificationService(userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("addCertificationAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function updateCertificationAction(id: number, userId: number, payload: any) {
    const { updateCertificationService } = await import("./freelancer-profile.service");
    
    try {
        await updateCertificationService(id, userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("updateCertificationAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function deleteCertificationAction(id: number, userId: number) {
    const { deleteCertificationService } = await import("./freelancer-profile.service");
    
    try {
        await deleteCertificationService(id, userId);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("deleteCertificationAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function updatePersonalInfoAction(userId: number, payload: any) {
    const { updatePersonalInfoService } = await import("./freelancer-profile.service");
    
    try {
        await updatePersonalInfoService(userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("updatePersonalInfoAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function updateProfileVisibilityAction(userId: number, profileId: number | undefined, visibility: string) {
    const { upsertJobSeekerProfileInDirectus } = await import("./freelancer-profile.repo");
    
    try {
        await upsertJobSeekerProfileInDirectus(userId, profileId, { profile_visibility: visibility });
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("updateProfileVisibilityAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function saveAllProfileChangesAction(payload: any) {
    const { userId, profileId, personalInfo, visibility, professionalSummary, skills, initialSkillIds, education, workExperience, certifications } = payload;
    
    // Import all services
    const { 
        updatePersonalInfoService, 
        addEducationService, updateEducationService, deleteEducationService,
        addWorkExperienceService, updateWorkExperienceService, deleteWorkExperienceService,
        addCertificationService, updateCertificationService, deleteCertificationService
    } = await import("./freelancer-profile.service");

    const { upsertJobSeekerProfileInDirectus } = await import("./freelancer-profile.repo");

    try {
        if (personalInfo) {
            await updatePersonalInfoService(userId, personalInfo);
        }

        if (visibility !== null || professionalSummary !== null) {
            const profileUpdates: any = {};
            if (visibility !== null) profileUpdates.profile_visibility = visibility;
            if (professionalSummary !== null) profileUpdates.professional_summary = professionalSummary;
            await upsertJobSeekerProfileInDirectus(userId, profileId, profileUpdates);
        }

        if (education && education.length > 0) {
            for (const action of education) {
                if (action.type === 'ADD') await addEducationService(userId, action.payload);
                else if (action.type === 'UPDATE') await updateEducationService(action.id, userId, action.payload);
                else if (action.type === 'DELETE') await deleteEducationService(action.id, userId);
            }
        }

        if (workExperience && workExperience.length > 0) {
            for (const action of workExperience) {
                if (action.type === 'ADD') await addWorkExperienceService(userId, action.payload);
                else if (action.type === 'UPDATE') await updateWorkExperienceService(action.id, userId, action.payload);
                else if (action.type === 'DELETE') await deleteWorkExperienceService(action.id, userId);
            }
        }

        if (certifications && certifications.length > 0) {
            for (const action of certifications) {
                if (action.type === 'ADD') await addCertificationService(userId, action.payload);
                else if (action.type === 'UPDATE') await updateCertificationService(action.id, userId, action.payload);
                else if (action.type === 'DELETE') await deleteCertificationService(action.id, userId);
            }
        }

        if (skills !== null) {
            await saveUserSkillsAction(userId, initialSkillIds || [], skills);
        }

        const { revalidatePath } = await import("next/cache");
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        
        return { success: true };
    } catch (err: any) {
        console.error("saveAllProfileChangesAction Error:", err);
        return { success: false, error: err.message };
    }
}

