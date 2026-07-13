"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Plus, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { uploadMediaAction } from "../services/freelancer-profile.actions";
import { VsCertification } from "../types/freelancer-profile.types";

interface CertificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    certificationToEdit?: VsCertification | null;
}

export function CertificationsModal({ isOpen, onClose, userId, certificationToEdit }: CertificationsModalProps) {
    const [certificateName, setCertificateName] = useState("");
    const [issuingOrganization, setIssuingOrganization] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [credentialUrl, setCredentialUrl] = useState("");
    const [imageUuid, setImageUuid] = useState("");
    
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data, pendingCertifications, setCertificationsDraft } = useFreelancerProfileContext();

    const liveCertifications = data?.certifications || [];
    const certificationsList = pendingCertifications !== null ? pendingCertifications : liveCertifications;

    useEffect(() => {
        if (isOpen) {
            if (certificationToEdit) {
                setCertificateName(certificationToEdit.certificate_name || "");
                setIssuingOrganization(certificationToEdit.issuing_organization || "");
                setIssueDate(certificationToEdit.issue_date || "");
                setCredentialUrl(certificationToEdit.credential_url || "");
                setImageUuid(certificationToEdit.image_uuid || "");
            } else {
                setCertificateName("");
                setIssuingOrganization("");
                setIssueDate("");
                setCredentialUrl("");
                setImageUuid("");
            }
            setErrors({});
        }
    }, [isOpen, certificationToEdit]);

    if (!isOpen) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const res = await uploadMediaAction(formData);
            if (!res.success || !res.url) {
                throw new Error(res.error || "Upload failed");
            }
            
            setImageUuid(res.url);
            toast.success("Image uploaded successfully");
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image", { description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        const newErrors: Record<string, string> = {};
        
        if (!certificateName.trim()) {
            newErrors.certificateName = "Certificate name is required";
        }
        if (!issuingOrganization.trim()) {
            newErrors.issuingOrganization = "Issuing organization is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Validation failed", { description: "Please fill in all required fields." });
            return;
        }

        const payload = {
            certificate_name: certificateName,
            issuing_organization: issuingOrganization,
            issue_date: issueDate || null,
            credential_url: credentialUrl || null,
            image_uuid: imageUuid || null,
        };

        const updatedList = [...certificationsList];

        if (certificationToEdit) {
            const index = updatedList.findIndex(c => c.id === certificationToEdit.id);
            if (index >= 0) {
                updatedList[index] = { ...updatedList[index], ...payload } as VsCertification;
            }
        } else {
            updatedList.push({
                id: -Math.floor(Math.random() * 1000000), // temp id
                user_id: userId,
                ...payload
            } as VsCertification);
        }

        setCertificationsDraft(updatedList);
        onClose();
    };

    const handleDelete = () => {
        if (!certificationToEdit) return;
        if (!confirm("Are you sure you want to delete this certification?")) return;
        
        const updatedList = certificationsList.filter(c => c.id !== certificationToEdit.id);
        setCertificationsDraft(updatedList);
        onClose();
    };

    const previewUrl = imageUuid ? (imageUuid.startsWith("http") ? imageUuid : `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${imageUuid}`) : "";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        {certificationToEdit ? "Edit Certification" : "Add Certification"}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Certificate Name *</label>
                        <input
                            type="text"
                            value={certificateName}
                            onChange={(e) => {
                                setCertificateName(e.target.value);
                                if (errors.certificateName) setErrors(prev => ({ ...prev, certificateName: "" }));
                            }}
                            className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                errors.certificateName ? "border-destructive focus-visible:ring-destructive" : "border-input"
                            }`}
                            placeholder="e.g. AWS Certified Solutions Architect"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Issuing Organization *</label>
                        <input
                            type="text"
                            value={issuingOrganization}
                            onChange={(e) => {
                                setIssuingOrganization(e.target.value);
                                if (errors.issuingOrganization) setErrors(prev => ({ ...prev, issuingOrganization: "" }));
                            }}
                            className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                errors.issuingOrganization ? "border-destructive focus-visible:ring-destructive" : "border-input"
                            }`}
                            placeholder="e.g. Amazon Web Services"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Issue Date</label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Credential URL</label>
                        <input
                            type="url"
                            value={credentialUrl}
                            onChange={(e) => setCredentialUrl(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="e.g. https://www.credly.com/badges/..."
                        />
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium text-foreground">Certificate Image</label>
                        <p className="text-xs text-muted-foreground mb-2">Upload an image of your certificate (optional).</p>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileSelect}
                            accept="image/*"
                            disabled={isUploading}
                        />
                        
                        {!imageUuid ? (
                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full h-24 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                ) : (
                                    <ImageIcon className="h-6 w-6 mb-2" />
                                )}
                                <span className="text-sm">{isUploading ? "Uploading..." : "Click to upload image"}</span>
                            </Button>
                        ) : (
                            <div className="relative group rounded-lg border overflow-hidden aspect-video max-w-sm bg-muted flex items-center justify-center">
                                <img src={previewUrl} alt="Certificate" className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2">
                                    <Button 
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 rounded-full shadow-md"
                                        onClick={() => setImageUuid("")}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
                
                <div className="p-6 border-t shrink-0 flex items-center justify-between bg-muted/30">
                    {certificationToEdit ? (
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                        >
                            Delete Certification
                        </Button>
                    ) : (
                        <div></div>
                    )}
                    
                    <div className="flex gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleSave}
                            disabled={isUploading}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
