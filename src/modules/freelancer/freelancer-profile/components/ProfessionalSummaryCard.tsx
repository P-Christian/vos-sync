"use client";

import React from "react";
import { FileText } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";

export function ProfessionalSummaryCard() {
    const { data } = useFreelancerProfileContext();

    if (!data) return null;

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Professional Summary</h2>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-primary font-medium">
                    Edit
                </Button>
            </div>
            
            <div className="p-6">
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {data.job_seeker_profile?.[0]?.professional_summary || 'No professional summary provided.'}
                </p>
            </div>
        </div>
    );
}
