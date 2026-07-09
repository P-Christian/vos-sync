"use client";

import React, { useState } from "react";
import { FileText } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { ProfessionalSummaryModal } from "./ProfessionalSummaryModal";

export function ProfessionalSummaryCard() {
    const { data } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!data) return null;

    const profile = data.job_seeker_profile?.[0];
    const summary = profile?.professional_summary || '';
    const profileId = profile?.profile_id;

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Professional Summary</h2>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-primary font-medium"
                    onClick={() => setIsModalOpen(true)}
                >
                    Edit
                </Button>
            </div>
            
            <div className="p-6">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {summary || 'No professional summary provided.'}
                </p>
            </div>

            <ProfessionalSummaryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialSummary={summary}
                profileId={profileId}
                userId={data.user_id}
            />
        </div>
    );
}
