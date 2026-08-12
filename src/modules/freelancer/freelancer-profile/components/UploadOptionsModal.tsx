"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { FileText, Sparkles } from "lucide-react";

interface UploadOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadOnly: () => void;
    onUploadAndAutofill: () => void;
}

export function UploadOptionsModal({ isOpen, onClose, onUploadOnly, onUploadAndAutofill }: UploadOptionsModalProps) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Resume Upload Options
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        How would you like to process this resume?
                    </p>

                    <div 
                        className="p-4 rounded-xl border-2 border-border cursor-pointer transition-colors hover:border-primary/50 group"
                        onClick={onUploadOnly}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">Upload Only</h4>
                                <p className="text-sm text-muted-foreground">Just save the file to your profile documents.</p>
                            </div>
                        </div>
                    </div>

                    <div 
                        className="p-4 rounded-xl border-2 border-border cursor-pointer transition-colors hover:border-primary/50 group relative overflow-hidden"
                        onClick={onUploadAndAutofill}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">Upload & Autofill Profile</h4>
                                <p className="text-sm text-muted-foreground">Use AI to extract experience, education, and skills to update your profile automatically.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
