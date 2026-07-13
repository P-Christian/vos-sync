"use client";

import React, { useState } from "react";
import { FileUp, FileText, Download, Trash2, Eye, Globe, Lock, Users } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VisibilityModal } from "./VisibilityModal";

export function ResumeSidebar() {
    const { data, pendingVisibility } = useFreelancerProfileContext();
    const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);

    if (!data) return null;

    const profile = data.job_seeker_profile?.[0];
    const visibility = pendingVisibility ?? profile?.profile_visibility ?? "Public";

    return (
        <div className="space-y-6">
            <div className="border border-dashed rounded-xl p-8 text-center bg-card flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Resume/CV</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                        Upload your latest professional document. PDF, DOCX (Max 5MB)
                    </p>
                </div>
                <Button className="w-full sm:w-auto font-medium">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Upload New File
                </Button>
            </div>

            <div className="bg-card text-card-foreground border rounded-xl shadow-sm p-6 space-y-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Current Document
                </h3>
                
                {profile?.resume_file_url ? (
                    <div className="space-y-6">
                        <div className="bg-muted/30 border rounded-lg p-4 flex flex-col items-center justify-center aspect-[3/4] relative">
                            {/* Abstract Document Visual */}
                            <div className="w-24 h-32 bg-background border shadow-sm rounded flex flex-col p-2 space-y-2 opacity-50">
                                <div className="h-2 w-3/4 bg-muted rounded"></div>
                                <div className="h-2 w-full bg-muted rounded"></div>
                                <div className="h-2 w-5/6 bg-muted rounded"></div>
                                <div className="h-8 w-full bg-muted rounded mt-2"></div>
                                <div className="h-2 w-full bg-muted rounded mt-auto"></div>
                            </div>
                        </div>
                        
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="h-8 w-8 text-destructive shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        Resume Document
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(profile.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <span className="text-sm text-muted-foreground">Parsing Status:</span>
                            <Badge variant="secondary" className="badge-success text-xs">
                                Completed
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Our AI has parsed this resume to improve your search visibility by 34%.
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No document uploaded.</p>
                )}
            </div>

            <div className="bg-card text-card-foreground border rounded-xl shadow-sm p-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                        {visibility === "Private" ? <Lock className="h-5 w-5" /> : visibility === "Recruiters Only" ? <Users className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">{visibility}</p>
                        <p className="text-xs text-muted-foreground">Profile Visibility</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="relative" onClick={() => setIsVisibilityModalOpen(true)}>
                    Change Visibility
                    {pendingVisibility && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background"></span>
                    )}
                </Button>
            </div>

            <VisibilityModal 
                isOpen={isVisibilityModalOpen}
                onClose={() => setIsVisibilityModalOpen(false)}
            />
        </div>
    );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
