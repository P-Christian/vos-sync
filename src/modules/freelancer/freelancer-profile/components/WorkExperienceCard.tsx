"use client";

import React, { useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { WorkExperienceModal } from "./WorkExperienceModal";
import { WorkExperienceItem } from "./WorkExperienceItem";

export function WorkExperienceCard() {
    const { data: profile } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!profile) return null;

    const workExperience = profile.work_experience || [];
    // Optionally sort work experience by start_date descending
    const sortedExperience = [...workExperience].sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return dateB - dateA;
    });

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Work Experience</h3>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus className="h-5 w-5" />
                </Button>
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
