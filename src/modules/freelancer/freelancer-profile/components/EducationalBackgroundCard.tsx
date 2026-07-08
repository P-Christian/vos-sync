"use client";

import React from "react";
import { GraduationCap } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";

export function EducationalBackgroundCard() {
    const { data: profile } = useFreelancerProfileContext();

    if (!profile) return null;

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-foreground">Educational Background</h3>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-8 px-2 font-medium">
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
                                <h4 className="font-medium text-foreground">{edu.institution}</h4>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 font-medium">Edit</Button>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {edu.degree}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Graduated {edu.graduationYear}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
