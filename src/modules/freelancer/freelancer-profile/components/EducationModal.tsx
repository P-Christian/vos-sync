"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { addEducationAction, updateEducationAction, deleteEducationAction } from "../services/freelancer-profile.actions";
import { VsEducation } from "../types/freelancer-profile.types";

interface EducationModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    educationToEdit?: VsEducation | null;
}

export function EducationModal({ isOpen, onClose, userId, educationToEdit }: EducationModalProps) {
    const [institutionName, setInstitutionName] = useState("");
    const [degree, setDegree] = useState("");
    const [fieldOfStudy, setFieldOfStudy] = useState("");
    const [graduationYear, setGraduationYear] = useState("");
    
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const router = useRouter();
    const { refresh } = useFreelancerProfileContext();

    useEffect(() => {
        if (isOpen) {
            if (educationToEdit) {
                setInstitutionName(educationToEdit.institution_name || "");
                setDegree(educationToEdit.degree || "");
                setFieldOfStudy(educationToEdit.field_of_study || "");
                setGraduationYear(educationToEdit.graduation_year ? String(educationToEdit.graduation_year) : "");
            } else {
                setInstitutionName("");
                setDegree("");
                setFieldOfStudy("");
                setGraduationYear("");
            }
            setErrors({});
        }
    }, [isOpen, educationToEdit]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const newErrors: Record<string, string> = {};
        
        if (!institutionName.trim()) {
            newErrors.institutionName = "School name is required";
        }

        if (!graduationYear.trim()) {
            newErrors.graduationYear = "Graduation year is required";
        } else {
            const year = parseInt(graduationYear, 10);
            if (isNaN(year) || year < 1900 || year > 2100) {
                newErrors.graduationYear = "Please enter a valid 4-digit year";
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            
            let desc = "";
            if (newErrors.institutionName && newErrors.graduationYear?.includes("required")) {
                desc = "School name and graduation year are required.";
            } else {
                desc = Object.values(newErrors).join(". ");
            }

            toast.error("Validation failed", { description: desc });
            return;
        }

        setIsSaving(true);
        setErrors({});
        
        const payload = {
            institution_name: institutionName,
            degree: degree || null,
            field_of_study: fieldOfStudy || null,
            graduation_year: parseInt(graduationYear, 10),
        };

        try {
            let res;
            if (educationToEdit) {
                res = await updateEducationAction(educationToEdit.id, userId, payload);
            } else {
                res = await addEducationAction(userId, payload);
            }
            
            if (!res.success) {
                throw new Error(res.error || `Failed to ${educationToEdit ? 'update' : 'add'} education`);
            }

            router.refresh();
            await refresh(); // Force client-side state refresh
            toast.success(educationToEdit ? "Education updated" : "Education added", { 
                description: "Your educational background has been saved." 
            });
            
            onClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : `Failed to ${educationToEdit ? 'update' : 'add'} education.`;
            toast.error("Save failed", { description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!educationToEdit) return;
        if (!confirm("Are you sure you want to delete this education record?")) return;
        
        setIsDeleting(true);
        try {
            const res = await deleteEducationAction(educationToEdit.id, userId);
            if (!res.success) {
                throw new Error(res.error || "Failed to delete education");
            }
            
            router.refresh();
            await refresh();
            toast.success("Education deleted", { description: "The record has been removed." });
            onClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete.";
            toast.error("Delete failed", { description: errorMessage });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        {educationToEdit ? "Edit Education" : "Add Education"}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">School Name *</label>
                        <input
                            type="text"
                            value={institutionName}
                            onChange={(e) => {
                                setInstitutionName(e.target.value);
                                if (errors.institutionName) setErrors(prev => ({ ...prev, institutionName: "" }));
                            }}
                            className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                errors.institutionName ? "border-destructive focus-visible:ring-destructive" : "border-input"
                            }`}
                            placeholder="e.g. University of Science"
                            disabled={isSaving}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Degree</label>
                            <input
                                type="text"
                                value={degree}
                                onChange={(e) => setDegree(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. Bachelor of Science"
                                disabled={isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Field of Study</label>
                            <input
                                type="text"
                                value={fieldOfStudy}
                                onChange={(e) => setFieldOfStudy(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. Computer Science"
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Graduation Year *</label>
                        <input
                            type="text"
                            value={graduationYear}
                            onChange={(e) => {
                                setGraduationYear(e.target.value);
                                if (errors.graduationYear) setErrors(prev => ({ ...prev, graduationYear: "" }));
                            }}
                            className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                errors.graduationYear ? "border-destructive focus-visible:ring-destructive" : "border-input"
                            }`}
                            placeholder="e.g. 2024"
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    {educationToEdit && (
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete} 
                            disabled={isSaving || isDeleting}
                            className="mr-auto"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving || isDeleting}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Education
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
