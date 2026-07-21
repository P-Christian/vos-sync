"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface School {
    id: number;
    school_name: string;
}

interface MapSchoolModalProps {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    group: {
        count: number;
        display_name: string;
    };
    onSubmit: (officialSchoolId: number) => Promise<void>;
}

export function MapSchoolModal({ 
    open, 
    onOpenChange, 
    group, 
    onSubmit 
}: MapSchoolModalProps) {
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const fetchSchools = useCallback(async () => {
        try {
            const res = await fetch("/api/vos-admin/schools?status=Active");
            const data = await res.json();
            setSchools(data.schools || []);
        } catch (err) {
            console.error("Failed to load schools", err);
        }
    }, []);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedSchool("");
            fetchSchools();
        }
    }, [open, fetchSchools]);

    const handleSubmit = async () => {
        if (!selectedSchool) return;
        setLoading(true);
        await onSubmit(Number(selectedSchool));
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Map to Official School</DialogTitle>
                    <DialogDescription>
                        Select the official school to link to the {group?.count} freelancers who typed &quot;{group?.display_name}&quot;.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an official school" />
                        </SelectTrigger>
                        <SelectContent>
                            {schools.map(s => (
                                <SelectItem key={s.id || s.school_name} value={(s.id || s.school_name).toString()}>
                                    {s.school_name}
                                </SelectItem>
                            ))}
                            {schools.length === 0 && (
                                <SelectItem value="disabled" disabled>
                                    No active schools found
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!selectedSchool || loading}>
                        {loading ? "Mapping..." : "Map & Verify"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
