"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { VsJobPreferences } from "../types/freelancer-profile.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface JobPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPreferences: Partial<VsJobPreferences>;
    userId: number;
}

export function JobPreferencesModal({ isOpen, onClose, initialPreferences }: JobPreferencesModalProps) {
    const { setJobPreferencesDraft, pendingJobPreferences } = useFreelancerProfileContext();
    
    const [preferences, setPreferences] = useState<Partial<VsJobPreferences>>({});

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreferences(pendingJobPreferences !== null ? pendingJobPreferences : initialPreferences);
        }
    }, [isOpen, pendingJobPreferences, initialPreferences]);

    if (!isOpen) return null;

    const handleSave = () => {
        setJobPreferencesDraft(preferences);
        onClose();
    };

    const handleChange = (field: keyof VsJobPreferences, value: string | number | null | undefined) => {
        setPreferences(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-background rounded-xl shadow-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-foreground">Edit Job Preferences</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Job Type</label>
                            <Select 
                                value={preferences.job_type || ""} 
                                onValueChange={(val) => handleChange("job_type", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select job type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Full-time">Full-time</SelectItem>
                                    <SelectItem value="Part-time">Part-time</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Freelance">Freelance</SelectItem>
                                    <SelectItem value="Internship">Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Work Setup</label>
                            <Select 
                                value={preferences.work_setup || ""} 
                                onValueChange={(val) => handleChange("work_setup", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select work setup" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Remote">Remote</SelectItem>
                                    <SelectItem value="On-site">On-site</SelectItem>
                                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Preferred Location</label>
                            <Input 
                                value={preferences.preferred_location || ""} 
                                onChange={(e) => handleChange("preferred_location", e.target.value)}
                                placeholder="e.g. Metro Manila, Cebu, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Preferred Industry</label>
                            <Input 
                                value={preferences.preferred_industry || ""} 
                                onChange={(e) => handleChange("preferred_industry", e.target.value)}
                                placeholder="e.g. Technology, Healthcare, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Minimum Salary</label>
                            <Input 
                                type="number"
                                value={preferences.salary_range_min || ""} 
                                onChange={(e) => handleChange("salary_range_min", e.target.value ? Number(e.target.value) : null)}
                                placeholder="Min expected salary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Maximum Salary</label>
                            <Input 
                                type="number"
                                value={preferences.salary_range_max || ""} 
                                onChange={(e) => handleChange("salary_range_max", e.target.value ? Number(e.target.value) : null)}
                                placeholder="Max expected salary"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Availability</label>
                            <Select 
                                value={preferences.availability || ""} 
                                onValueChange={(val) => handleChange("availability", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select availability" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Immediate">Immediate</SelectItem>
                                    <SelectItem value="1 Week Notice">1 Week Notice</SelectItem>
                                    <SelectItem value="2 Weeks Notice">2 Weeks Notice</SelectItem>
                                    <SelectItem value="1 Month Notice">1 Month Notice</SelectItem>
                                    <SelectItem value="Not Looking">Not Looking currently</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Draft
                    </Button>
                </div>
            </div>
        </div>
    );
}
