"use client";

import React, { useRef, useState } from "react";
import { Plus, Loader2, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadMediaAction } from "../services/freelancer-profile.actions";
import { toast } from "sonner";

interface WorkExperienceMediaInputProps {
    mediaUrls: string[];
    onChange: (urls: string[]) => void;
    disabled?: boolean;
}

export function WorkExperienceMediaInput({ mediaUrls, onChange, disabled }: WorkExperienceMediaInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Reset input so the same file can be uploaded again if needed
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
            
            onChange([...mediaUrls, res.url]);
            toast.success("Media uploaded successfully");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to upload media";
            toast.error("Failed to upload media", { description: errorMessage });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveMedia = (indexToRemove: number) => {
        onChange(mediaUrls.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium text-foreground">Media</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Add media like images, documents, sites or presentations (up to 50).
                </p>
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx"
                    disabled={disabled || isUploading}
                />
                
                <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-full border-primary text-primary hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add media
                </Button>
            </div>
            
            {mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                    {mediaUrls.map((urlOrUuid, idx) => {
                        const isFullUrl = urlOrUuid.startsWith("http");
                        const previewUrl = isFullUrl ? urlOrUuid : `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${urlOrUuid}`;
                        const isImage = true; // Assuming all uploads here are images for now or handled by Directus asset endpoint
                        
                        return (
                            <div key={idx} className="relative group rounded-md border overflow-hidden bg-muted aspect-video flex items-center justify-center">
                                {isImage ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={previewUrl} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                                    </>
                                ) : (
                                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                                
                                <div className="absolute top-2 right-2 flex items-center justify-center">
                                    <Button 
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7 rounded-full shadow-md hover:bg-destructive/90"
                                        onClick={() => handleRemoveMedia(idx)}
                                        disabled={disabled}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        <span className="sr-only">Remove media</span>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
