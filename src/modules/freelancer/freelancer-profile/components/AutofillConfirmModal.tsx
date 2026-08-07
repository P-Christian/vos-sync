"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { Sparkles, AlertTriangle } from "lucide-react";

interface AutofillConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    fileName: string;
}

export function AutofillConfirmModal({ isOpen, onClose, onConfirm, fileName }: AutofillConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Confirm AI Autofill
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-foreground">
                        You are about to upload <strong className="font-semibold">{fileName}</strong> and use AI to extract your details.
                    </p>

                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p>
                                We will extract your <strong>Professional Summary, Work Experience, Education, and Skills</strong> and add them to your profile.
                            </p>
                            <p>
                                Don&apos;t worry—our AI acts as an intelligent merger. Existing data won&apos;t be duplicated.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={onConfirm}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Confirm Autofill
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
