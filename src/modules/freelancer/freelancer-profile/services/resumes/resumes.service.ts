import * as repo from "./resumes.repo";
import { uploadResumeSchema, setPrimaryResumeSchema, deleteResumeSchema } from "./resumes.schema";
import {
    FREELANCER_RESUME_UPLOAD_POLICY,
    getUploadedFile,
    safeFileName,
    validateUploadedFile,
} from "@/lib/file-upload";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const RESUME_FOLDER_ID =
    process.env.DIRECTUS_PROTECTED_FREELANCER_RESUMES_FOLDER_ID?.trim() ||
    process.env.DIRECTUS_PROTECTED_RESUME_FOLDER_ID?.trim() ||
    process.env.DIRECTUS_RESUME_FOLDER_ID?.trim() ||
    "c380f14b-75d1-4b61-b2b4-9a6e596f3162";

export async function uploadResumeService(userId: number, formData: FormData, fileName: string | null) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }
    
    const file = getUploadedFile(formData);
    await validateUploadedFile(file, FREELANCER_RESUME_UPLOAD_POLICY);

    // Zod Validation. The browser-provided name is metadata only; use a
    // sanitized basename and never allow a path to be persisted.
    const validated = uploadResumeSchema.parse({ file_name: safeFileName(fileName || file.name) });

    // 1. Upload the file to the specific Directus folder
    let fileResult: { id: string } | null = null;
    try {
        fileResult = await repo.uploadFileToDirectus(
            formData,
            NEXT_PUBLIC_API_BASE_URL,
            DIRECTUS_STATIC_TOKEN,
            RESUME_FOLDER_ID
        );

        // 2. Demote existing primary resumes to maintain uniqueness of `is_primary`
        await repo.demotePrimaryResumes(userId, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);

        // 3. Save new resume record as primary
        return await repo.addResumeRecord(
            userId,
            fileResult.id,
            validated.file_name || null,
            true, // By default, new uploads become the primary resume
            NEXT_PUBLIC_API_BASE_URL,
            DIRECTUS_STATIC_TOKEN
        );
    } catch (error) {
        // The file is known to have been created by this invocation, so it is
        // safe to compensate it when the resume metadata write fails.
        if (fileResult?.id) {
            await repo.deleteFileFromDirectus(fileResult.id, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN).catch((cleanupError) => {
                console.error("Failed to compensate resume upload:", cleanupError);
            });
        }
        throw error;
    }
}

export async function setPrimaryResumeService(userId: number, resumeId: number) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const validated = setPrimaryResumeSchema.parse({ id: resumeId });

    const ownedRecord = await repo.getResumeRecordById(validated.id, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);
    if (!ownedRecord || String(ownedRecord.user_id) !== String(userId)) {
        throw new Error("Resume does not belong to the authenticated user.");
    }

    // Demote current primary
    await repo.demotePrimaryResumes(userId, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);

    // Promote the selected one
    await repo.promoteResumeToPrimary(validated.id, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);
    
    return true;
}

export async function deleteResumeService(userId: number, resumeId: number) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    const validated = deleteResumeSchema.parse({ id: resumeId });
    
    // 1. Fetch record to get file_url
    const record = await repo.getResumeRecordById(validated.id, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);
    if (!record || String(record.user_id) !== String(userId)) {
        throw new Error("Resume does not belong to the authenticated user.");
    }
    const fileUrl = record?.file_url;
    
    // 2. Delete the database record
    await repo.deleteResumeRecord(validated.id, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);
    
    // 3. Delete the file from Directus
    if (fileUrl) {
        try {
            await repo.deleteFileFromDirectus(fileUrl, NEXT_PUBLIC_API_BASE_URL, DIRECTUS_STATIC_TOKEN);
        } catch (err) {
            console.warn(`[deleteResumeService] Failed to delete Directus file ${fileUrl}:`, err);
        }
    }
    
    return true;
}
