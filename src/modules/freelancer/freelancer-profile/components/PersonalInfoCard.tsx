"use client";

import React, { useState } from "react";
import { User, Mail, MapPin, Briefcase } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { PersonalInfoModal } from "./PersonalInfoModal";

export function PersonalInfoCard() {
    const { data, pendingPersonalInfo } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!data) return null;

    // Use pending draft values if they exist, otherwise fallback to live data
    const displayData = { ...data, ...pendingPersonalInfo };

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-primary font-medium relative" onClick={() => setIsModalOpen(true)}>
                    Edit
                    {pendingPersonalInfo && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background"></span>
                    )}
                </Button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name</label>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                            {displayData.user_fname} {displayData.user_mname ? displayData.user_mname + ' ' : ''}{displayData.user_lname} {displayData.suffix_name || ''}
                        </span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Primary Role</label>
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground hidden" />
                        <span className="font-medium text-foreground">{displayData.user_position || 'Not specified'}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email Address</label>
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground hidden" />
                        <span className="font-medium text-foreground">{displayData.user_email}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Contact Number</label>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{displayData.user_contact || 'Not specified'}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Location</label>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground hidden" />
                        <span className="font-medium text-foreground">
                            {[displayData.user_brgy, displayData.user_city, displayData.user_province].filter(Boolean).join(', ') || 'Not specified'}
                        </span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Gender</label>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{displayData.gender || 'Not specified'}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Birthday</label>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{displayData.user_bday || 'Not specified'}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Religion</label>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{displayData.religion || 'Not specified'}</span>
                    </div>
                </div>
            </div>
            
            <PersonalInfoModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
