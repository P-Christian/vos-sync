"use client";

import React from "react";
import { Award } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";

export function CertificationsCard() {
    const { data: profile } = useFreelancerProfileContext();

    if (!profile) return null;

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-foreground">Certifications</h3>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-8 px-2 font-medium">
                    + Add Certification
                </Button>
            </div>

            <div className="space-y-4">
                {profile.certifications?.map((cert) => (
                    <div key={cert.id} className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                            <Award className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-foreground">{cert.name}</h4>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 font-medium">Edit</Button>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {cert.issuer}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Issued {cert.issueDate}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
