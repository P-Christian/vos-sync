export async function uploadFileToDirectus(formData: FormData, apiUrl: string, token: string, folderId: string) {
    const url = `${apiUrl}/files`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData,
    });
    
    if (!res.ok) {
        throw new Error(`Failed to upload media: HTTP ${res.status}`);
    }
    
    const json = await res.json();
    const fileId = json.data.id;

    if (folderId) {
        // Move the file into the specific folder using a reliable PATCH request
        const patchRes = await fetch(`${url}/${fileId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ folder: folderId })
        });
        
        if (!patchRes.ok) {
            console.error(`Failed to assign folder to file ${fileId}`);
        }
    }

    return { url: fileId, id: fileId };
}

export async function addResumeRecord(userId: number, fileUrl: string, fileName: string | null, isPrimary: boolean, apiUrl: string, token: string) {
    const url = `${apiUrl}/items/vs_job_seeker_resumes`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: userId,
            file_url: fileUrl,
            file_name: fileName,
            is_primary: isPrimary
        })
    });
    
    if (!res.ok) {
        throw new Error(`Failed to save resume record: HTTP ${res.status}`);
    }
    
    const json = await res.json();
    return json.data;
}

export async function demotePrimaryResumes(userId: number, apiUrl: string, token: string) {
    // We update all resumes for this user where is_primary = true, set to false
    // Directus supports bulk update by query or by passing array of ids.
    // Fetch current primary first
    const fetchUrl = `${apiUrl}/items/vs_job_seeker_resumes?filter[user_id][_eq]=${userId}&filter[is_primary][_eq]=true`;
    const fetchRes = await fetch(fetchUrl, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!fetchRes.ok) return;
    const fetchData = await fetchRes.json();
    
    if (fetchData.data && fetchData.data.length > 0) {
        const ids = fetchData.data.map((r: any) => r.id);
        const updateUrl = `${apiUrl}/items/vs_job_seeker_resumes`;
        const payload = {
            keys: ids,
            data: { is_primary: false }
        };
        await fetch(updateUrl, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
    }
}

export async function promoteResumeToPrimary(id: number, apiUrl: string, token: string) {
    const url = `${apiUrl}/items/vs_job_seeker_resumes/${id}`;
    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_primary: true })
    });
    
    if (!res.ok) {
        throw new Error(`Failed to set primary resume: HTTP ${res.status}`);
    }
}

export async function deleteResumeRecord(id: number, apiUrl: string, token: string) {
    const url = `${apiUrl}/items/vs_job_seeker_resumes/${id}`;
    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    
    if (!res.ok) {
        throw new Error(`Failed to delete resume record: HTTP ${res.status}`);
    }
}
