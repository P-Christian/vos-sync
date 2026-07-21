"use client";

import React, { useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { WorkExperienceModal } from "./WorkExperienceModal";
import { WorkExperienceItem } from "./WorkExperienceItem";

export function WorkExperienceCard() {
    const { data: profile, pendingWorkExperience } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!profile) return null;

    const liveExperience = profile.work_experience || [];
    const workExperience = pendingWorkExperience !== null ? pendingWorkExperience : liveExperience;
    // Optionally sort work experience by start_date descending
    const sortedExperience = [...workExperience].sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateB - dateA;
    });

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Work Experience</h3>
                    {sortedExperience.length > 0 ? (
                        <div className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                    ) : (
                        <div className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {pendingWorkExperience !== null && (
                        <span className="h-2.5 w-2.5 bg-primary rounded-full" title="Unsaved changes" />
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {sortedExperience.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No work experience added yet.</p>
            ) : (
                <div className="space-y-6">
                    {sortedExperience.map((exp, index) => (
                        <WorkExperienceItem 
                            key={exp.id} 
                            experience={exp} 
                            userId={profile.user_id}
                            isLast={index === sortedExperience.length - 1} 
                        />
                    ))}
                </div>
            )}

            <WorkExperienceModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                userId={profile.user_id}
            />
        </div>
    );
}
