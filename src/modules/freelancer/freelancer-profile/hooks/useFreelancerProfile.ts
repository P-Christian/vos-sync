import { useState, useCallback, useEffect } from "react";
import { FreelancerProfile, VsUserSkillMap } from "../types/freelancer-profile.types";

export function useFreelancerProfile() {
    const [data, setData] = useState<FreelancerProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

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

    const addSkill = useCallback((skillMap: VsUserSkillMap) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                skills: [...(prev.skills || []), skillMap],
            };
        });
    }, []);

    const removeSkill = useCallback((skillId: number) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                skills: (prev.skills || []).filter((s) => s.skill_id !== skillId),
            };
        });
    }, []);

    return {
        data,
        isLoading,
        error,
        refresh,
        updateProfile,
        addSkill,
        removeSkill,
    };
}
