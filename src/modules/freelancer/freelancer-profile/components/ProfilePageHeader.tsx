"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";

export function ProfilePageHeader() {
    const { data, saveAllChanges, isSaving, hasPendingChanges } = useFreelancerProfileContext();

    const handleSave = async () => {
        const res = await saveAllChanges();
        if (res.success) {
            toast.success("Changes saved", { description: "Your profile has been successfully updated." });
        } else {
            toast.error("Failed to save changes", { description: res.error || "An unknown error occurred." });
        }
    };

    return (
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-foreground">Freelancer Profile</h1>
                    {data?.job_seeker_profile?.[0]?.profile_completion_percent !== undefined && (
                        <div className="flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                            <span className="mr-1">Completeness:</span>
                            <span>{data.job_seeker_profile[0].profile_completion_percent}%</span>
                        </div>
                    )}
                </div>
                {hasPendingChanges && (
                    <span className="text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded-md">
                        Unsaved changes
                    </span>
                )}
            </div>
            <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasPendingChanges}
            >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? "Saving..." : "Save Changes"}
            </Button>
        </div>
    );
}

