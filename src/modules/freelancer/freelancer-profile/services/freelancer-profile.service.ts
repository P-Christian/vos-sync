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
