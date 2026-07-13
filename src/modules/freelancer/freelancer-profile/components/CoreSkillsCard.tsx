"use client";

import React, { useState } from "react";
import { Zap, Plus } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoreSkillsModal } from "./CoreSkillsModal";

export function CoreSkillsCard() {
    const { data, pendingSkills } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!data) return null;

    const skillsList = pendingSkills !== null ? pendingSkills : data.skills || [];

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center relative">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Core Skills</h2>
                </div>
                <div className="flex items-center gap-2">
                    {pendingSkills !== null && (
                        <span className="h-2.5 w-2.5 bg-primary rounded-full" title="Unsaved changes" />
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
            </div>
            
            <div className="p-6">
                <div className="flex flex-wrap gap-2">
                    {skillsList.length ? (
                        skillsList.map((s, index) => (
                            <Badge key={s.skill?.id || index} variant="outline" className="px-3 py-1.5 text-xs font-medium border-primary text-primary bg-primary/5">
                                {s.skill?.skill_name || 'Unknown Skill'}
                            </Badge>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-sm">No skills added yet.</p>
                    )}
                </div>
            </div>

            <CoreSkillsModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={data.user_id}
                initialSkills={skillsList}
            />
        </div>
    );
}
