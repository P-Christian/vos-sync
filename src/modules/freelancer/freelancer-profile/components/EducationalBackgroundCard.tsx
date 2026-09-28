"use client";

import React, { useState } from "react";
import { GraduationCap, Plus, Pencil, CircleCheck } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EducationModal } from "./EducationModal";
import { VsEducation } from "../types/freelancer-profile.types";

export function EducationalBackgroundCard() {
    const { data: profile, pendingEducation, isAutofilling } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEducation, setEditingEducation] = useState<VsEducation | null>(null);

    if (!profile) return null;

    const educationList = pendingEducation !== null ? pendingEducation : profile.education || [];
    const visibleEducation = educationList.filter((education) => education.attendance_rejected !== true);
    const attendanceFullyVerified =
        visibleEducation.length > 0 &&
        visibleEducation.every((education) => education.education_status === "Verified");

    const handleAddClick = () => {
        setEditingEducation(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (edu: VsEducation) => {
        setEditingEducation(edu);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Educational Background</h3>
                    {attendanceFullyVerified ? (
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
                    {pendingEducation !== null && (
                        <span className="h-2.5 w-2.5 bg-primary rounded-full" title="Unsaved changes" />
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary max-md:size-11"
                        onClick={handleAddClick}
                        disabled={isAutofilling}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {isAutofilling ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-[40%]" />
                                <Skeleton className="h-4 w-[30%]" />
                                <Skeleton className="h-3 w-[20%]" />
                            </div>
                        </div>
                    ))
                ) : visibleEducation.map((edu) => (
                    <div key={edu.id} className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                            <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex min-w-0 items-center gap-2">
                                        <h4 className="font-medium text-foreground break-words">{edu.school_name || edu.school_name_raw || "Unknown School"}</h4>
                                        {edu.education_status === 'Verified' && (
                                            <span className="shrink-0 inline-flex items-center text-green-600 dark:text-green-500" title="Attendance verified">
                                                <CircleCheck className="h-4 w-4" />
                                                <span className="sr-only">Attendance verified</span>
                                            </span>
                                        )}
                                    </span>
                                    {edu.education_status === 'Pending' && (
                                        <StatusBadge tone="warning">
                                            Pending Verification
                                        </StatusBadge>
                                    )}
                                    {edu.education_status === 'Unverified' && (
                                        <StatusBadge tone="destructive">
                                            Unverified
                                        </StatusBadge>
                                    )}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary max-md:size-11"
                                    onClick={() => handleEditClick(edu)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>
                            {edu.course_verification?.status !== 'Rejected' && (
                                <div className="text-sm font-medium text-muted-foreground">
                                    {edu.course_name || edu.course_name_raw || "No Course Specified"}
                                </div>
                            )}
                            <div className="text-sm md:text-xs text-muted-foreground">
                                {edu.start_date ? new Date(edu.start_date).getFullYear() : "?"} - {edu.end_date ? new Date(edu.end_date).getFullYear() : "Present"}
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
