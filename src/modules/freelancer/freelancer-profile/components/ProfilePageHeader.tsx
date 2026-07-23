"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, User } from "lucide-react";
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
        <div className="space-y-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-cyan-950 via-zinc-900 to-blue-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 h-40 w-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
                            <User className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Freelancer Profile</h1>
                            <p className="text-sm text-zinc-300 mt-1">
                                Customize and manage your professional freelancer profile details.
                            </p>
                        </div>
                    </div>
                    {hasPendingChanges && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                                Unsaved changes
                            </span>
                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-xl h-10"
                            >
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

