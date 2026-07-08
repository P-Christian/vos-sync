"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useFreelancerProfile } from "../hooks/useFreelancerProfile";

type FreelancerProfileContextType = ReturnType<typeof useFreelancerProfile>;

const FreelancerProfileContext = createContext<FreelancerProfileContextType | undefined>(undefined);

export function FreelancerProfileProvider({ children }: { children: ReactNode }) {
    const profile = useFreelancerProfile();

    return (
        <FreelancerProfileContext.Provider value={profile}>
            {children}
        </FreelancerProfileContext.Provider>
    );
}

export function useFreelancerProfileContext() {
    const context = useContext(FreelancerProfileContext);
    if (context === undefined) {
        throw new Error("useFreelancerProfileContext must be used within a FreelancerProfileProvider");
    }
    return context;
}
