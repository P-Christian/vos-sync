"use client";

import React from "react";
import { User, Mail, MapPin, Briefcase } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";

export function PersonalInfoCard() {
    const { data } = useFreelancerProfileContext();

    if (!data) return null;

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-primary font-medium">
                    Edit
                </Button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name</label>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{data.fullName}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Primary Role</label>
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground hidden" />
                        <span className="font-medium text-foreground">{data.primaryRole}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email Address</label>
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground hidden" />
                        <span className="font-medium text-foreground">{data.email}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Location</label>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground hidden" />
                        <span className="font-medium text-foreground">{data.location}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
