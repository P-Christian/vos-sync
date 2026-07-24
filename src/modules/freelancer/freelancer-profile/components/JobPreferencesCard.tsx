"use client";

import React, { useState } from "react";
import { Briefcase, Pencil } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { JobPreferencesModal } from "./JobPreferencesModal";
import { VsJobPreferences } from "../types/freelancer-profile.types";

export function JobPreferencesCard() {
    const { data, pendingJobPreferences } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!data) return null;

    const livePreferences = data.job_preferences?.[0] || ({} as Partial<VsJobPreferences>);
    const preferences = pendingJobPreferences !== null ? pendingJobPreferences : livePreferences;
    
    // Check completion status for the card header indicator
    const isComplete = Boolean(preferences.job_type && preferences.availability);

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center relative">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Job Preferences</h2>
                    {isComplete ? (
                        <div className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                    ) : (
                        <div className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        </div>
                    )}
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary relative"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Pencil className="h-4 w-4" />
                    {pendingJobPreferences !== null && (
                        <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-primary rounded-full border-2 border-background" />
                    )}
                </Button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Job Type</p>
                    <p className="text-sm">{preferences.job_type || 'Not specified'}</p>
                </div>
                
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Work Setup</p>
                    <p className="text-sm">{preferences.work_setup || 'Not specified'}</p>
                </div>
                
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Preferred Location</p>
                    <p className="text-sm">{preferences.preferred_location || 'Not specified'}</p>
                </div>
                
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Industry</p>
                    <p className="text-sm">{preferences.preferred_industry || 'Not specified'}</p>
                </div>
                
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Salary Range</p>
                    <p className="text-sm">
                        {(() => {
                            const currencySymbols: Record<string, string> = {
                                PHP: "₱",
                                USD: "$",
                                EUR: "€",
                                GBP: "£",
                                AUD: "A$",
                                SGD: "S$",
                                JPY: "¥"
                            };
                            const symbol = currencySymbols[preferences.currency || "PHP"] || "₱";
                            return preferences.salary_range_min && preferences.salary_range_max
                                ? `${symbol}${preferences.salary_range_min.toLocaleString()} - ${symbol}${preferences.salary_range_max.toLocaleString()}`
                                : preferences.salary_range_min 
                                    ? `From ${symbol}${preferences.salary_range_min.toLocaleString()}`
                                    : preferences.salary_range_max
                                        ? `Up to ${symbol}${preferences.salary_range_max.toLocaleString()}`
                                        : 'Not specified';
                        })()}
                    </p>
                </div>
                
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Availability</p>
                    <p className="text-sm">{preferences.availability || 'Not specified'}</p>
                </div>
            </div>

            <JobPreferencesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialPreferences={preferences}
                userId={data.user_id}
            />
        </div>
    );
}
