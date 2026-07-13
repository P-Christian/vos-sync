"use server";

import { revalidatePath } from "next/cache";
import { updateProfessionalSummaryService, updatePersonalInfoService } from "./personal-info.service";

export async function updateProfessionalSummaryAction(summary: string, profileId?: number, userId?: number) {
    try {
        await updateProfessionalSummaryService(summary, profileId, userId);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("updateProfessionalSummaryAction Error:", err);
        return { success: false, error: err.message };
    }
}

export async function updatePersonalInfoAction(userId: number, payload: any) {
    try {
        await updatePersonalInfoService(userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: any) {
        console.error("updatePersonalInfoAction Error:", err);
        return { success: false, error: err.message };
    }
}
