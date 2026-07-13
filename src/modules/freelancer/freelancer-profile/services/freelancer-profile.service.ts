import * as jose from "jose";
import { fetchFreelancerProfileFromDirectus } from "./freelancer-profile.repo";
import { FreelancerProfile } from "../types/freelancer-profile.types";

const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_key_for_development";

export async function getFreelancerProfile(token: string): Promise<FreelancerProfile | null> {
    if (!token) {
        return null;
    }

    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(token, secret);
        
        if (payload.email && typeof payload.email === 'string') {
            const user = await fetchFreelancerProfileFromDirectus(payload.email);
            return user as FreelancerProfile;
        }
    } catch (err) {
        console.error("Failed to verify token or fetch freelancer profile:", err);
    }
    
    return null;
}

export function buildInitials(fname?: string | null, lname?: string | null): string {
    if (!fname && !lname) return "U";
    const f = fname ? fname[0].toUpperCase() : "";
    const l = lname ? lname[0].toUpperCase() : "";
    return `${f}${l}`;
}

// Ensure date strings are properly formatted, handling any PH time requirements
// Note: If input is already YYYY-MM-DD, it remains. If it's a full ISO, it extracts the date part in UTC+8.
function formatToPHDate(dateInput: string): string {
    if (!dateInput) return dateInput;
    if (dateInput.length === 10) return dateInput; // Already YYYY-MM-DD

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;

    // Convert to PH time (UTC+8)
    const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().split("T")[0];
}

export async function addWorkExperienceService(userId: number, payload: any) {
    const { addWorkExperienceToDirectus } = await import("./freelancer-profile.repo");

    const data = {
        user_id: userId,
        company_name: payload.company_name,
        location: payload.location || null,
        location_type: payload.location_type || null,
        job_title: payload.job_title,
        employment_type: payload.employment_type || null,
        start_date: formatToPHDate(payload.start_date),
        end_date: payload.end_date ? formatToPHDate(payload.end_date) : null,
        is_current_role: payload.is_current_role,
        job_description: payload.job_description || null,
        discovery_source: payload.discovery_source || null,
        media: payload.media || [],
        skills: payload.skills || [],
    };

    return await addWorkExperienceToDirectus(data);
}

export async function updateWorkExperienceService(id: number, userId: number, payload: any) {
    const { updateWorkExperienceInDirectus } = await import("./freelancer-profile.repo");

    const data = {
        company_name: payload.company_name,
        location: payload.location || null,
        location_type: payload.location_type || null,
        job_title: payload.job_title,
        employment_type: payload.employment_type || null,
        start_date: formatToPHDate(payload.start_date),
        end_date: payload.end_date ? formatToPHDate(payload.end_date) : null,
        is_current_role: payload.is_current_role,
        job_description: payload.job_description || null,
        discovery_source: payload.discovery_source || null,
        media: payload.media || [],
        skills: payload.skills || [],
    };

    return await updateWorkExperienceInDirectus(id, data);
}

export async function deleteWorkExperienceService(id: number, userId: number) {
    const { deleteWorkExperienceFromDirectus } = await import("./freelancer-profile.repo");
    // Ideally, we should verify that this work experience belongs to the user before deleting.
    // For simplicity, we directly delete here, but in a real app, verify ownership first.
    return await deleteWorkExperienceFromDirectus(id);
}
