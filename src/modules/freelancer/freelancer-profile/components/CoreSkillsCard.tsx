"use client";

import React from "react";
import { Zap, Plus } from "lucide-react";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CoreSkillsCard() {
    const { data } = useFreelancerProfileContext();

    if (!data) return null;

    return (
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Core Skills</h2>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-primary font-medium">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Skill
                </Button>
            </div>
            
            <div className="p-6">
                <div className="flex flex-wrap gap-2">
                    {data.skills?.length ? (
                        data.skills.map((s) => (
                            <Badge key={s.skill_id} variant="secondary" className="px-3 py-1.5 text-xs font-medium badge-info">
                                {s.skill?.skill_name || 'Unknown Skill'}
                            </Badge>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-sm">No skills added yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
