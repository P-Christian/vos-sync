"use client";

import React, { useState } from "react";
import { FileText, Pencil } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { ProfessionalSummaryModal } from "./ProfessionalSummaryModal";

export function ProfessionalSummaryCard() {
    const { data, pendingProfessionalSummary } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!data) return null;

    const profile = data.job_seeker_profile?.[0];
    const liveSummary = profile?.professional_summary || '';
    const summary = pendingProfessionalSummary !== null ? pendingProfessionalSummary : liveSummary;
    const profileId = profile?.profile_id;

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center relative">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Professional Summary</h2>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary relative"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Pencil className="h-4 w-4" />
                    {pendingProfessionalSummary !== null && (
                        <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-primary rounded-full border-2 border-background" />
                    )}
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
