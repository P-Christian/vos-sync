"use client";

import React, { useState } from "react";
import { Zap, Plus } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoreSkillsModal } from "./CoreSkillsModal";

export function CoreSkillsCard() {
    const { data } = useFreelancerProfileContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!data) return null;

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Core Skills</h2>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-primary font-medium"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Skill
                </Button>
            </div>
            
            <div className="p-6">
                <div className="flex flex-wrap gap-2">
                    {data.skills?.length ? (
                        data.skills.map((s, index) => (
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
                initialSkills={data.skills || []}
            />
        </div>
    );
}
