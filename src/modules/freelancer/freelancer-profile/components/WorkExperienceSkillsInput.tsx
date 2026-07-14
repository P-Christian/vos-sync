"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { searchMasterSkillsAction } from "../services/freelancer-profile.actions";
import { VsMasterSkill } from "../types/freelancer-profile.types";

interface WorkExperienceSkillsInputProps {
    selectedSkills: VsMasterSkill[];
    onChange: (skills: VsMasterSkill[]) => void;
    disabled?: boolean;
}

export function WorkExperienceSkillsInput({ selectedSkills, onChange, disabled }: WorkExperienceSkillsInputProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<VsMasterSkill[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const results = await searchMasterSkillsAction(searchQuery.trim());
                    setSearchResults(results || []);
                } catch (error) {
                    console.error("Failed to search skills:", error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSelectSkill = (skill: VsMasterSkill) => {
        if (!selectedSkills.some(s => s.id === skill.id) && selectedSkills.length < 5) {
            onChange([...selectedSkills, skill]);
            setSearchQuery(""); // Clear search after adding
        }
    };

    const handleRemoveSkill = (skillId: number) => {
        onChange(selectedSkills.filter(s => s.id !== skillId));
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium text-foreground">Skills</label>
                <p className="text-xs text-muted-foreground mb-2">We recommend adding your top 5 used in this role. They&apos;ll also appear in your Skills section.</p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Skill (ex: Project Management)"
                        disabled={disabled || selectedSkills.length >= 5}
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && searchQuery.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-md z-10 max-h-60 overflow-y-auto">
                            {searchResults.map((skill) => (
                                <button
                                    key={skill.id}
                                    type="button"
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted focus:bg-muted transition-colors disabled:opacity-50 flex items-center justify-between"
                                    onClick={() => handleSelectSkill(skill)}
                                    disabled={selectedSkills.some(s => s.id === skill.id) || selectedSkills.length >= 5}
                                >
                                    <span>{skill.skill_name}</span>
                                    {selectedSkills.some(s => s.id === skill.id) && (
                                        <span className="text-xs text-muted-foreground">Added</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-md z-10 px-4 py-3 text-sm text-center text-muted-foreground">
                            No skills found.
                        </div>
                    )}
                </div>
            </div>

            {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                        <Badge key={skill.id} variant="outline" className="pl-3 pr-1 py-1.5 flex items-center gap-1 border-primary text-primary bg-primary/5 text-sm h-9">
                            {skill.skill_name}
                            <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill.id)}
                                className="ml-1 h-5 w-5 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                                disabled={disabled}
                            >
                                <X className="h-3 w-3" />
                                <span className="sr-only">Remove {skill.skill_name}</span>
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
