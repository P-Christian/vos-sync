"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { addWorkExperienceAction } from "../services/freelancer-profile.actions";
import { VsMasterSkill } from "../types/freelancer-profile.types";
import { WorkExperienceSkillsInput } from "./WorkExperienceSkillsInput";
import { WorkExperienceMediaInput } from "./WorkExperienceMediaInput";

interface WorkExperienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
}

export function WorkExperienceModal({ isOpen, onClose, userId }: WorkExperienceModalProps) {
    const [companyName, setCompanyName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isCurrentRole, setIsCurrentRole] = useState(false);
    const [jobDescription, setJobDescription] = useState("");
    const [location, setLocation] = useState("");
    const [locationType, setLocationType] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [selectedSkills, setSelectedSkills] = useState<VsMasterSkill[]>([]);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { refresh } = useFreelancerProfileContext();

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!companyName.trim() || !jobTitle.trim() || !startDate) {
            setError("Company name, job title, and start date are required.");
            return;
        }

        setIsSaving(true);
        setError(null);
        
        const payload = {
            company_name: companyName,
            location: location,
            location_type: locationType,
            job_title: jobTitle,
            employment_type: employmentType,
            start_date: startDate,
            end_date: isCurrentRole ? null : (endDate || null),
            is_current_role: isCurrentRole,
            job_description: jobDescription,
            skills: selectedSkills.map(s => ({ skill_id: s.id })),
            media: mediaUrls.map(url => ({
                media_type: "image",
                media_url: url
            })),
        };

        try {
            const res = await addWorkExperienceAction(userId, payload);
            if (!res.success) {
                throw new Error(res.error || "Failed to add work experience");
            }

            router.refresh();
            await refresh(); // Force client-side state refresh
            toast.success("Experience added", { description: "Your work experience has been saved." });
            
            // Reset form
            setCompanyName("");
            setJobTitle("");
            setLocation("");
            setLocationType("");
            setEmploymentType("");
            setStartDate("");
            setEndDate("");
            setIsCurrentRole(false);
            setJobDescription("");
            setSelectedSkills([]);
            setMediaUrls([]);
            
            onClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to add work experience.";
            setError(errorMessage);
            toast.error("Save failed", { description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold text-foreground">Add Work Experience</DialogTitle>
                </DialogHeader>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Company Name *</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="e.g. Acme Corp"
                            disabled={isSaving}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Job Title *</label>
                        <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="e.g. Software Engineer"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Location</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. Metro Manila"
                                disabled={isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Location Type</label>
                            <select
                                value={locationType}
                                onChange={(e) => setLocationType(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isSaving}
                            >
                                <option value="">Select Type</option>
                                <option value="On-site">On-site</option>
                                <option value="Hybrid">Hybrid</option>
                                <option value="Remote">Remote</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Employment Type</label>
                        <select
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSaving}
                        >
                            <option value="">Select Type</option>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Freelance">Freelance</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Start Date *</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isSaving || isCurrentRole}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="isCurrentRole"
                            checked={isCurrentRole}
                            onChange={(e) => {
                                setIsCurrentRole(e.target.checked);
                                if (e.target.checked) setEndDate("");
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                            disabled={isSaving}
                        />
                        <label htmlFor="isCurrentRole" className="text-sm font-medium text-foreground cursor-pointer">
                            I currently work here
                        </label>
                    </div>

                    <div className="pt-2">
                        <WorkExperienceSkillsInput 
                            selectedSkills={selectedSkills} 
                            onChange={setSelectedSkills} 
                            disabled={isSaving} 
                        />
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className="w-full min-h-[120px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Describe your responsibilities and achievements..."
                            disabled={isSaving}
                        />
                    </div>

                    <div className="pt-4 border-t">
                        <WorkExperienceMediaInput
                            mediaUrls={mediaUrls}
                            onChange={setMediaUrls}
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Experience
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
