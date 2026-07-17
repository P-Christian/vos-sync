"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MapSchoolModal({ 
    open, 
    onOpenChange, 
    group, 
    onSubmit 
}: { 
    open: boolean; 
    onOpenChange: (o: boolean) => void;
    group: any;
    onSubmit: (officialSchoolId: number) => Promise<void>;
}) {
    const [schools, setSchools] = useState<any[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedSchool("");
            // Fetch official schools
            fetch("/api/vos-admin/schools?status=Active")
                .then(res => res.json())
                .then(data => {
                    setSchools(data.schools || []);
                })
                .catch(err => console.error("Failed to load schools", err));
        }
    }, [open]);

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
                        Select the official school to link to the {group?.count} freelancers who typed "{group?.display_name}".
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an official school" />
                        </SelectTrigger>
                        <SelectContent>
                            {schools.map(s => (
                                <SelectItem key={s.id || s.school_id} value={(s.id || s.school_id).toString()}>
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
