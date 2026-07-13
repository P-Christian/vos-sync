import { useState, useCallback, useEffect } from "react";
import { FreelancerProfile, VsUserSkillMap, VsEducation, VsWorkExperience, VsCertification, DraftAction } from "../types/freelancer-profile.types";

export function useFreelancerProfile() {
    const [data, setData] = useState<FreelancerProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Single item drafts
    const [pendingPersonalInfo, setPendingPersonalInfoState] = useState<Partial<FreelancerProfile> | null>(null);
    const [pendingVisibility, setPendingVisibilityState] = useState<string | null>(null);
    const [pendingProfessionalSummary, setPendingProfessionalSummaryState] = useState<string | null>(null);

    // List item drafts (null means no draft changes, [] means user deleted everything)
    const [pendingSkills, setPendingSkills] = useState<VsUserSkillMap[] | null>(null);
    const [pendingEducation, setPendingEducation] = useState<VsEducation[] | null>(null);
    const [pendingWorkExperience, setPendingWorkExperience] = useState<VsWorkExperience[] | null>(null);
    const [pendingCertifications, setPendingCertifications] = useState<VsCertification[] | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/freelancer/profile', { cache: 'no-store' });
            const result = await res.json();
            
            if (result.ok && result.data) {
                setData(result.data);
            } else {
                throw new Error(result.message || "Failed to load profile");
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to load profile"));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const updateProfile = useCallback((updates: Partial<FreelancerProfile>) => {
        setData((prev) => (prev ? { ...prev, ...updates } : prev));
    }, []);

    // Draft Helpers
    const setPersonalInfoDraft = useCallback((draft: Partial<FreelancerProfile>) => {
        setPendingPersonalInfoState(draft);
    }, []);

    const setVisibilityDraft = useCallback((value: string) => {
        setPendingVisibilityState(value);
    }, []);

    const setProfessionalSummaryDraft = useCallback((value: string) => {
        setPendingProfessionalSummaryState(value);
    }, []);

    // List Draft Helpers
    const setSkillsDraft = useCallback((skills: VsUserSkillMap[]) => {
        setPendingSkills(skills);
    }, []);

    const setEducationDraft = useCallback((education: VsEducation[]) => {
        setPendingEducation(education);
    }, []);

    const setWorkExperienceDraft = useCallback((workExperience: VsWorkExperience[]) => {
        setPendingWorkExperience(workExperience);
    }, []);

    const setCertificationsDraft = useCallback((certifications: VsCertification[]) => {
        setPendingCertifications(certifications);
    }, []);

    const clearDrafts = useCallback(() => {
        setPendingPersonalInfoState(null);
        setPendingVisibilityState(null);
        setPendingProfessionalSummaryState(null);
        setPendingSkills(null);
        setPendingEducation(null);
        setPendingWorkExperience(null);
        setPendingCertifications(null);
    }, []);

    const hasPendingChanges = 
        pendingPersonalInfo !== null || 
        pendingVisibility !== null || 
        pendingProfessionalSummary !== null ||
        pendingSkills !== null ||
        pendingEducation !== null ||
        pendingWorkExperience !== null ||
        pendingCertifications !== null;

    const saveAllChanges = useCallback(async () => {
        if (!data) return { success: false, error: "No profile data loaded" };
        if (!hasPendingChanges) return { success: true };

        setIsSaving(true);
        try {
            const { saveAllProfileChangesAction } = await import("../services/freelancer-profile.actions");
            
            // Helper to generate DraftAction lists
            const generateDiff = <T extends { id: number }>(live: T[] = [], draft: T[] | null = []) => {
                if (draft === null) return null;
                const actions: DraftAction<T>[] = [];
                const liveIds = new Set(live.map(item => item.id));
                const draftIds = new Set(draft.map(item => item.id));

                // Deletes
                live.forEach(item => {
                    if (!draftIds.has(item.id)) {
                        actions.push({ type: 'DELETE', id: item.id });
                    }
                });

                // Adds and Updates
                draft.forEach(item => {
                    if (item.id < 0) {
                        actions.push({ type: 'ADD', payload: item as any }); // Cast as any because temp items have negative id, which backend might ignore
                    } else if (liveIds.has(item.id)) {
                        const liveItem = live.find(l => l.id === item.id);
                        if (JSON.stringify(liveItem) !== JSON.stringify(item)) {
                            actions.push({ type: 'UPDATE', id: item.id, payload: item as any });
                        }
                    }
                });
                return actions.length > 0 ? actions : null;
            };

            const payload = {
                userId: data.user_id,
                profileId: data.job_seeker_profile?.[0]?.profile_id,
                personalInfo: pendingPersonalInfo,
                visibility: pendingVisibility,
                professionalSummary: pendingProfessionalSummary,
                skills: pendingSkills !== null ? pendingSkills.map(s => (s.skill ? s.skill.id : (typeof s.skill_id === 'object' ? (s.skill_id as any)?.id : s.skill_id))) : null,
                initialSkillIds: data.skills ? data.skills.map(s => (s.skill ? s.skill.id : (typeof s.skill_id === 'object' ? (s.skill_id as any)?.id : s.skill_id))) : [],
                education: generateDiff(data.education, pendingEducation),
                workExperience: generateDiff(data.work_experience, pendingWorkExperience),
                certifications: generateDiff(data.certifications, pendingCertifications)
            };

            const res = await saveAllProfileChangesAction(payload);
            
            if (res.success) {
                clearDrafts();
                await refresh();
                return { success: true };
            } else {
                return { success: false, error: res.error || "Failed to save changes" };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setIsSaving(false);
        }
    }, [
        data, hasPendingChanges, pendingPersonalInfo, pendingVisibility, 
        pendingProfessionalSummary, pendingSkills, pendingEducation, 
        pendingWorkExperience, pendingCertifications, clearDrafts, refresh
    ]);

    return {
        data,
        isLoading,
        error,
        refresh,
        updateProfile,
        // Draft states
        pendingPersonalInfo,
        pendingVisibility,
        pendingProfessionalSummary,
        pendingSkills,
        pendingEducation,
        pendingWorkExperience,
        pendingCertifications,
        // Setters
        setPersonalInfoDraft,
        setVisibilityDraft,
        setProfessionalSummaryDraft,
        setSkillsDraft,
        setEducationDraft,
        setWorkExperienceDraft,
        setCertificationsDraft,
        clearDrafts,
        hasPendingChanges,
        saveAllChanges,
        isSaving,
    };
}
