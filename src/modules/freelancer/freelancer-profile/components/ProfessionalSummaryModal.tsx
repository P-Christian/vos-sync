/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { generateProfessionalSummaryAction } from "../services/freelancer-profile.actions";
import { toast } from "sonner";

interface ProfessionalSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSummary: string;
    profileId?: number;
    userId: number;
}

export function ProfessionalSummaryModal({ isOpen, onClose, initialSummary }: ProfessionalSummaryModalProps) {
    const [summary, setSummary] = useState(initialSummary);
    const [isGenerating, setIsGenerating] = useState(false);
    const { setProfessionalSummaryDraft, pendingProfessionalSummary, data } = useFreelancerProfileContext();

    // Keep state in sync if modal is reopened
    React.useEffect(() => {
        if (isOpen) {
            setSummary(pendingProfessionalSummary !== null ? pendingProfessionalSummary : initialSummary);
        }
    }, [isOpen, pendingProfessionalSummary, initialSummary]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setProfessionalSummaryDraft(summary);
        onClose();
    };

    const handleGenerateAI = async () => {
        if (!data) return;
        setIsGenerating(true);
        try {
            const res = await generateProfessionalSummaryAction(JSON.stringify(data));
            if (res.success && res.summary) {
                setSummary(res.summary);
                toast.success("Professional summary generated successfully!");
            } else {
                toast.error(res.error || "Failed to generate summary");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-background rounded-xl shadow-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-foreground">Edit Professional Summary</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-foreground">Summary</label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-primary border-primary/20 hover:bg-primary/10 gap-1.5"
                                onClick={handleGenerateAI}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Generate with AI
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            Highlight your top skills, experience, and what makes you unique as a professional.
                        </p>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full min-h-[200px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Write your professional summary here..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={summary === initialSummary}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
