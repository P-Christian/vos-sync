"use server";

import { revalidatePath } from "next/cache";
import { updateProfessionalSummaryService, updatePersonalInfoService } from "./personal-info.service";

export async function updateProfessionalSummaryAction(summary: string, profileId?: number, userId?: number) {
    try {
        await updateProfessionalSummaryService(summary, profileId, userId);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: unknown) {
        console.error("updateProfessionalSummaryAction Error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function updatePersonalInfoAction(userId: number, payload: Record<string, unknown>) {
    try {
        await updatePersonalInfoService(userId, payload);
        revalidatePath("/(vos-sync)/vos-sync/freelancer/profile");
        return { success: true };
    } catch (err: unknown) {
        console.error("updatePersonalInfoAction Error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}
