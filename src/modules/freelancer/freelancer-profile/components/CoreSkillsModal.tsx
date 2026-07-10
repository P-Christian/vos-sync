"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { searchMasterSkillsAction, saveUserSkillsAction } from "../services/freelancer-profile.actions";
import { VsUserSkillMap } from "../types/freelancer-profile.types";

interface CoreSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    initialSkills: VsUserSkillMap[];
}

export function CoreSkillsModal({ isOpen, onClose, userId, initialSkills }: CoreSkillsModalProps) {
    const [selectedSkills, setSelectedSkills] = useState<{ id: number; skill_name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: number; skill_name: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const router = useRouter();
    const { refresh } = useFreelancerProfileContext();
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedSkills(
                initialSkills
                    .filter(s => s.skill)
                    .map(s => ({ id: s.skill.id, skill_name: s.skill.skill_name }))
            );
            setSearchQuery("");
            setSearchResults([]);
            setError(null);
        }
    }, [isOpen, initialSkills]);

    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        if (searchQuery.trim().length >= 2) {
            setIsSearching(true);
            debounceTimeout.current = setTimeout(async () => {
                try {
                    const results = await searchMasterSkillsAction(searchQuery.trim());
                    setSearchResults(results);
                } catch (err) {
                    console.error("Search failed:", err);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [searchQuery]);

    if (!isOpen) return null;

    const handleSelectSkill = (skill: { id: number; skill_name: string }) => {
        if (!selectedSkills.some(s => s.id === skill.id)) {
            setSelectedSkills(prev => [...prev, skill]);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleRemoveSkill = (skillId: number) => {
        setSelectedSkills(prev => prev.filter(s => s.id !== skillId));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const initialSkillIds = initialSkills.filter(s => s.skill).map(s => s.skill.id);
            const skillIds = selectedSkills.map(s => s.id);
            await saveUserSkillsAction(userId, initialSkillIds, skillIds);
            
            router.refresh();
            await refresh(); // Force client-side state refresh
            
            toast.success("Skills updated", { description: "Your core skills have been saved." });
            onClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to update skills.";
            setError(errorMessage);
            toast.error("Update failed", { description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-background rounded-xl shadow-lg flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b shrink-0">
                    <h2 className="text-xl font-semibold text-foreground">Manage Core Skills</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="p-6 overflow-visible flex-1 flex flex-col gap-6">
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    {/* Combobox Search */}
                    <div className="space-y-2 relative">
                        <label className="text-sm font-medium text-foreground">Search and Add Skills</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Type at least 2 characters to search..."
                                disabled={isSaving}
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && searchQuery.length >= 2 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-md z-10 max-h-60 overflow-y-auto">
                                {searchResults.map((skill) => (
                                    <button
                                        key={skill.id}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted focus:bg-muted transition-colors disabled:opacity-50 flex items-center justify-between"
                                        onClick={() => handleSelectSkill(skill)}
                                        disabled={selectedSkills.some(s => s.id === skill.id)}
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

                    {/* Selected Skills Table */}
                    <div className="space-y-2 flex-1 flex flex-col min-h-[200px]">
                        <label className="text-sm font-medium text-foreground">Selected Skills</label>
                        <div className="border rounded-md overflow-hidden flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Skill Name</th>
                                        <th className="px-4 py-3 font-medium text-right w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedSkills.length === 0 ? (
                                        <tr>
                                            <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground italic">
                                                No skills selected. Search and click above to add skills.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedSkills.map((skill) => (
                                            <tr key={skill.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors group">
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {skill.skill_name}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2"
                                                        onClick={() => handleRemoveSkill(skill.id)}
                                                        disabled={isSaving}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
