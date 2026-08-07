"use server";

import { revalidatePath } from "next/cache";
import { uploadResumeService, setPrimaryResumeService, deleteResumeService } from "./resumes.service";
import { checkRestriction } from "@/lib/status-validator";

export async function uploadResumeAction(userId: number, formData: FormData, fileName: string | null) {
    try {
        const isRestricted = await checkRestriction(userId, "UPLOAD_PROFILE_FILES");
        if (isRestricted) {
            throw new Error("Your profile file upload privileges are temporarily suspended.");
        }

        await uploadResumeService(userId, formData, fileName);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: unknown) {
        console.error("uploadResumeAction Error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function setPrimaryResumeAction(userId: number, resumeId: number) {
    try {
        await setPrimaryResumeService(userId, resumeId);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: unknown) {
        console.error("setPrimaryResumeAction Error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function deleteResumeAction(resumeId: number) {
    try {
        await deleteResumeService(resumeId);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: unknown) {
        console.error("deleteResumeAction Error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function uploadAndAutofillResumeAction(userId: number, formData: FormData, fileName: string | null, currentProfileJson: string) {
    try {
        const isRestricted = await checkRestriction(userId, "UPLOAD_PROFILE_FILES");
        if (isRestricted) {
            throw new Error("Your profile file upload privileges are temporarily suspended.");
        }

        // 1. Upload the resume first
        await uploadResumeService(userId, formData, fileName);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");

        // 2. Extract the file buffer for Gemini
        const file = formData.get("file") as File;
        if (!file) {
            throw new Error("No file found in formData");
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // 3. Import parser service and parse
        const { parseResumeWithGemini, mergeProfileDataWithGemini } = await import("@/lib/gemini/resumeParser");
        const parsedData = await parseResumeWithGemini(buffer, file.type || 'application/pdf');

        // 4. Merge with existing profile data
        const mergedData = await mergeProfileDataWithGemini(parsedData, currentProfileJson);

        return { success: true, parsedData: mergedData };
    } catch (err: unknown) {
        console.error("uploadAndAutofillResumeAction Error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}
