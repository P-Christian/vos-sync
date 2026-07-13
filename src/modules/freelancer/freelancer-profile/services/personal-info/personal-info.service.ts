import * as repo from "./personal-info.repo";
import { z } from "zod";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export async function updateProfessionalSummaryService(summary: string, profileId?: number, userId?: number) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }
    
    // Zod Validation could be added here if there was a schema for professional_summary alone
    // But since it's just a string, we ensure it's provided.
    if (typeof summary !== 'string') {
        throw new Error("Invalid professional summary.");
    }

    return await repo.updateProfessionalSummary(
        profileId, 
        userId, 
        summary, 
        NEXT_PUBLIC_API_BASE_URL, 
        DIRECTUS_STATIC_TOKEN
    );
}

export async function updatePersonalInfoService(userId: number, payload: any) {
    if (!NEXT_PUBLIC_API_BASE_URL || !DIRECTUS_STATIC_TOKEN) {
        throw new Error("Directus API URL or Static Token is not configured.");
    }

    return await repo.updatePersonalInfo(
        userId,
        payload,
        NEXT_PUBLIC_API_BASE_URL,
        DIRECTUS_STATIC_TOKEN
    );
}
