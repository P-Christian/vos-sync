import { useState, useCallback } from "react";
import { FreelancerProfile, FreelancerSkill } from "../types/freelancer-profile.types";
import { getMockFreelancerProfile } from "../services/freelancer-profile.service";

export function useFreelancerProfile() {
    const [data, setData] = useState<FreelancerProfile | null>(getMockFreelancerProfile());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Simulated API delay
            await new Promise((resolve) => setTimeout(resolve, 500));
            setData(getMockFreelancerProfile());
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to load profile"));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateProfile = useCallback((updates: Partial<FreelancerProfile>) => {
        setData((prev) => (prev ? { ...prev, ...updates } : prev));
    }, []);

    const addSkill = useCallback((skill: FreelancerSkill) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                skills: [...prev.skills, skill],
            };
        });
    }, []);

    const removeSkill = useCallback((skillId: string) => {
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                skills: prev.skills.filter((s) => s.id !== skillId),
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
