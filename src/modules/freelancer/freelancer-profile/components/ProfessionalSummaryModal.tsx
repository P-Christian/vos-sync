"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";

interface ProfessionalSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSummary: string;
    profileId?: number;
    userId: number;
}

export function ProfessionalSummaryModal({ isOpen, onClose, initialSummary, profileId, userId }: ProfessionalSummaryModalProps) {
    const [summary, setSummary] = useState(initialSummary);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setProfessionalSummaryDraft, pendingProfessionalSummary } = useFreelancerProfileContext();

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-background rounded-xl shadow-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-foreground">Edit Professional Summary</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Summary</label>
                        <p className="text-sm text-muted-foreground mb-2">
                            Highlight your top skills, experience, and what makes you unique as a professional.
                        </p>
                        <textarea
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full min-h-[200px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Write your professional summary here..."
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving || summary === initialSummary}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
