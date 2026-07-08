"use client";

import React from "react";
import { Briefcase } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";

export function WorkExperienceCard() {
    const { data: profile } = useFreelancerProfileContext();

    if (!profile) return null;

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-foreground">Work Experience</h3>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-8 px-2 font-medium">
                    + Add Experience
                </Button>
            </div>

            <div className="space-y-6">
                {profile.workExperience?.map((exp, index) => (
                    <div key={exp.id} className="relative">
                        {index !== profile.workExperience.length - 1 && (
                            <div className="absolute top-8 bottom-0 left-2 w-px bg-border -ml-px" />
                        )}
                        <div className="flex gap-4">
                            <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 mt-1.5">
                                <div className="h-2 w-2 rounded-full bg-blue-600" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-foreground">{exp.title}</h4>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 font-medium">Edit</Button>
                                </div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    {exp.company}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                                </div>
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                    {exp.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
