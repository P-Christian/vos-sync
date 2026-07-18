"use client";

import React, { useState } from "react";
import { Award, Plus, Pencil } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { CertificationsModal } from "./CertificationsModal";
import { VsCertification } from "../types/freelancer-profile.types";

export function CertificationsCard() {
    const { data: profile, pendingCertifications } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [certificationToEdit, setCertificationToEdit] = useState<VsCertification | null>(null);

    if (!profile) return null;

    const liveCertifications = profile.certifications || [];
    const certificationsList = pendingCertifications !== null ? pendingCertifications : liveCertifications;

    return (
        <div className="bg-background rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Certifications</h3>
                </div>
                <div className="flex items-center gap-2">
                    {pendingCertifications !== null && (
                        <span className="h-2.5 w-2.5 bg-primary rounded-full" title="Unsaved changes" />
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => {
                            setCertificationToEdit(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {certificationsList.map((cert) => (
                    <div key={cert.id} className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                            <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-foreground">{cert.certificate_name}</h4>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                        setCertificationToEdit(cert);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {cert.issuing_organization}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Issued {cert.issue_date || 'N/A'}
                            </div>
                            {cert.image_uuid && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <div className="relative w-[120px] h-[70px] bg-muted rounded-md overflow-hidden border border-border shadow-sm transition-all hover:shadow-md cursor-pointer flex-shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={cert.image_uuid.startsWith('http') ? cert.image_uuid : `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${cert.image_uuid}`}
                                            alt={cert.certificate_name || "Certification Media"} 
                                            className="object-cover w-full h-full" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <CertificationsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={profile.user_id}
                certificationToEdit={certificationToEdit}
            />
        </div>
    );
}
