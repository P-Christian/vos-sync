"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Globe, Lock, Users } from "lucide-react";

interface VisibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VisibilityModal({ isOpen, onClose }: VisibilityModalProps) {
    const { data, pendingVisibility, setVisibilityDraft } = useFreelancerProfileContext();
    const [selectedVisibility, setSelectedVisibility] = useState<string>("Public");

    useEffect(() => {
        if (isOpen && data) {
            const currentVisibility = pendingVisibility ?? data.job_seeker_profile?.[0]?.profile_visibility ?? "Public";
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedVisibility(currentVisibility);
        }
    }, [isOpen, data, pendingVisibility]);

    if (!isOpen || !data) return null;

    const handleApply = () => {
        setVisibilityDraft(selectedVisibility);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Profile Visibility
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 space-y-4">
                    <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedVisibility === 'Public' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setSelectedVisibility('Public')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${selectedVisibility === 'Public' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">Public</h4>
                                <p className="text-sm text-muted-foreground">Visible to all registered users and recruiters.</p>
                            </div>
                        </div>
                    </div>

                    <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedVisibility === 'Private' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setSelectedVisibility('Private')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${selectedVisibility === 'Private' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Lock className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">Private</h4>
                                <p className="text-sm text-muted-foreground">Only you can see your profile.</p>
                            </div>
                        </div>
                    </div>

                    <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedVisibility === 'Recruiters Only' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setSelectedVisibility('Recruiters Only')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${selectedVisibility === 'Recruiters Only' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">Recruiters Only</h4>
                                <p className="text-sm text-muted-foreground">Visible only to verified recruiters and companies.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleApply}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Apply Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
