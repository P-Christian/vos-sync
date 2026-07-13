import * as repo from "./resumes.repo";
import { uploadResumeSchema, setPrimaryResumeSchema, deleteResumeSchema } from "./resumes.schema";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const RESUME_FOLDER_ID = "c380f14b-75d1-4b61-b2b4-9a6e596f3162";

export async function uploadResumeService(userId: number, formData: FormData, fileName: string | null) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }
    
    // Zod Validation
    const validated = uploadResumeSchema.parse({ file_name: fileName || undefined });

    // 1. Upload the file to the specific Directus folder
    const fileResult = await repo.uploadFileToDirectus(
        formData, 
        NEXT_PUBLIC_API_BASE_URL, 
        DIRECTUS_STATIC_TOKEN, 
        RESUME_FOLDER_ID
    );

    // 2. Demote existing primary resumes to maintain uniqueness of `is_primary`
    await repo.demotePrimaryResumes(userId, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);

    // 3. Save new resume record as primary
    const record = await repo.addResumeRecord(
        userId, 
        fileResult.id, 
        validated.file_name || null, 
        true, // By default, new uploads become the primary resume
        NEXT_PUBLIC_API_BASE_URL, 
        DIRECTUS_STATIC_TOKEN
    );

    return record;
}

export async function setPrimaryResumeService(userId: number, resumeId: number) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const validated = setPrimaryResumeSchema.parse({ id: resumeId });

    // Demote current primary
    await repo.demotePrimaryResumes(userId, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);

    // Promote the selected one
    await repo.promoteResumeToPrimary(validated.id, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);
    
    return true;
}

export async function deleteResumeService(resumeId: number) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const validated = deleteResumeSchema.parse({ id: resumeId });
    await repo.deleteResumeRecord(validated.id, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);
    return true;
}
