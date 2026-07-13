"use client";

import React, { useState } from "react";
import { GraduationCap } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { EducationModal } from "./EducationModal";

export function EducationalBackgroundCard() {
    const { data: profile } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEducation, setEditingEducation] = useState<any>(null);

    if (!profile) return null;

    const handleAddClick = () => {
        setEditingEducation(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (edu: any) => {
        setEditingEducation(edu);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-foreground">Educational Background</h3>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-700 h-8 px-2 font-medium"
                    onClick={handleAddClick}
                >
                    + Add Education
                </Button>
            </div>

            <div className="space-y-4">
                {profile.education?.map((edu) => (
                    <div key={edu.id} className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-foreground">{edu.institution_name}</h4>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-2 text-blue-600 font-medium"
                                    onClick={() => handleEditClick(edu)}
                                >
                                    Edit
                                </Button>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Graduated {edu.graduation_year}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <EducationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={profile.user_id}
                educationToEdit={editingEducation}
            />
        </div>
    );
}
