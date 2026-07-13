"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
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
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { data, pendingEducation, setEducationDraft } = useFreelancerProfileContext();
    
    const liveEducation = data?.education || [];
    const educationList = pendingEducation !== null ? pendingEducation : liveEducation;

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

        const payload = {
            institution_name: institutionName,
            degree: degree || null,
            field_of_study: fieldOfStudy || null,
            graduation_year: parseInt(graduationYear, 10),
        };

        const updatedList = [...educationList];

        if (educationToEdit) {
            const index = updatedList.findIndex(e => e.id === educationToEdit.id);
            if (index >= 0) {
                updatedList[index] = { ...updatedList[index], ...payload } as VsEducation;
            }
        } else {
            updatedList.push({
                id: -Math.floor(Math.random() * 1000000), // temp id
                user_id: userId,
                ...payload
            } as VsEducation);
        }

        setEducationDraft(updatedList);
        onClose();
    };

    const handleDelete = () => {
        if (!educationToEdit) return;
        if (!confirm("Are you sure you want to delete this education record?")) return;
        
        const updatedList = educationList.filter(e => e.id !== educationToEdit.id);
        setEducationDraft(updatedList);
        onClose();
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
                        />
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    {educationToEdit && (
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete} 
                            className="mr-auto"
                        >
                            Delete
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Save Education
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
