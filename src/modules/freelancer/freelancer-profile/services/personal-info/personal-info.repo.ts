import { VsJobSeekerProfile } from "../../types/freelancer-profile.types";

export async function updateProfessionalSummary(
    profileId: number | undefined, 
    userId: number | undefined, 
    summary: string, 
    apiUrl: string, 
    token: string
) {
    let targetProfileId = profileId;
    let method = profileId ? "PATCH" : "POST";

    if (!targetProfileId && userId) {
        const checkUrl = `${apiUrl}/items/vs_job_seeker_profile?filter[user_id][_eq]=${userId}`;
        const checkRes = await fetch(checkUrl, {
            headers: { "Authorization": `Bearer ${token}` },
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
        ? `${apiUrl}/items/vs_job_seeker_profile/${targetProfileId}`
        : `${apiUrl}/items/vs_job_seeker_profile`;
    
    const body = targetProfileId 
        ? { professional_summary: summary }
        : { professional_summary: summary, user_id: userId };

    const res = await fetch(url, {
        method,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error(`Failed to update professional summary: HTTP ${res.status}`);
    }
    
    return true;
}

export async function updatePersonalInfo(userId: number, payload: any, apiUrl: string, token: string) {
    const url = `${apiUrl}/users/${userId}`;
    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error(`Failed to update personal info: HTTP ${res.status}`);
    }
    return true;
}
