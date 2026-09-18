"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { Trash2 } from "lucide-react";

interface DeleteResumeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    fileName: string;
}

export function DeleteResumeModal({ isOpen, onClose, onConfirm, fileName }: DeleteResumeModalProps) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-sm p-0 overflow-hidden bg-background max-md:max-w-[calc(100vw-2rem)] max-md:max-h-[90dvh] max-md:overflow-y-auto">
                <DialogHeader className="p-6 border-b shrink-0 bg-destructive/5">
                    <DialogTitle className="text-xl font-semibold text-destructive flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Delete Resume
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-foreground">
                        Are you sure you want to delete <strong className="font-semibold">{fileName}</strong>?
                    </p>
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone. It will be removed from your profile completely.
                    </p>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    <Button variant="outline" onClick={onClose} className="max-md:min-h-11">
                        Cancel
                    </Button>
                    <Button 
                        variant="destructive"
                        onClick={onConfirm}
                        className="max-md:min-h-11"
                    >
                        Delete Document
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
