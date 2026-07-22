import { fetchUserVerifications, IdentityVerification } from "./identity-verification.repo";
import { FreelancerProfile } from "../types/freelancer-profile.types";
import { getFreelancerProfile } from "./freelancer-profile.service";

export interface IdProofScoreBreakdown {
    gov_id: number;
    address: number;
    mobile_number: number;
    profile_sections: number;
}

export interface IdProofScoreResult {
    score: number;
    breakdown: IdProofScoreBreakdown;
    can_apply: boolean;
}

export async function calculateIdProofScore(token: string): Promise<IdProofScoreResult | null> {
    const profile = await getFreelancerProfile(token);
    if (!profile) return null;

    const verifications = await fetchUserVerifications(profile.user_id);

    let gov_id = 0;
    let address = 0;
    let mobile_number = 0;

    for (const v of verifications) {
        if (v.status === 'approved') {
            if (v.type === 'gov_id') gov_id = 20;
            if (v.type === 'address') address = 20;
            if (v.type === 'mobile_number') mobile_number = 20;
        }
    }

    let completedProfileSections = 0;
    const totalProfileSections = 6;

    // 1. Personal Info
    if (profile.user_fname && profile.user_lname && profile.user_bday && profile.gender) {
        completedProfileSections++;
    }
    // 2. Resume Document
    if (profile.resumes && profile.resumes.length > 0) {
        completedProfileSections++;
    }
    // 3. Professional Summary
    if (profile.job_seeker_profile?.[0]?.professional_summary) {
        completedProfileSections++;
    }
    // 4. Core Skills
    if (profile.skills && profile.skills.length > 0) {
        completedProfileSections++;
    }
    // 5. Work Experience History
    if (profile.work_experience && profile.work_experience.length > 0) {
        completedProfileSections++;
    }
    // 6. Educational Background
    if (profile.education && profile.education.length > 0) {
        completedProfileSections++;
    }

    const profile_sections = Math.round((completedProfileSections / totalProfileSections) * 40);

    const totalScore = gov_id + address + mobile_number + profile_sections;

    return {
        score: totalScore,
        breakdown: {
            gov_id,
            address,
            mobile_number,
            profile_sections
        },
        can_apply: totalScore >= 80
    };
}
