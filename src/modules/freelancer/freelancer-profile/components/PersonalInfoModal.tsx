"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { FreelancerProfile } from "../types/freelancer-profile.types";

interface PersonalInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PersonalInfoModal({ isOpen, onClose }: PersonalInfoModalProps) {
    const { data, pendingPersonalInfo, setPersonalInfoDraft } = useFreelancerProfileContext();
    
    // Initial state setup based on pending draft or live data
    const [formData, setFormData] = useState<Partial<FreelancerProfile>>({});

    useEffect(() => {
        if (isOpen && data) {
            // Use pending draft if it exists, otherwise use live data
            const source = pendingPersonalInfo || data;
            setFormData({
                user_fname: source.user_fname || "",
                user_mname: source.user_mname || "",
                user_lname: source.user_lname || "",
                suffix_name: source.suffix_name || "",
                nickname: source.nickname || "",
                user_contact: source.user_contact || "",
                user_bday: source.user_bday || "",
                gender: source.gender || "",
                civil_status: source.civil_status || "",
                blood_type: source.blood_type || "",
                religion: source.religion || "",
                nationality: source.nationality || "",
                place_of_birth: source.place_of_birth || "",
                user_province: source.user_province || "",
                user_city: source.user_city || "",
                user_brgy: source.user_brgy || "",
            });
        }
    }, [isOpen, data, pendingPersonalInfo]);

    if (!isOpen || !data) return null;

    const handleApply = () => {
        setPersonalInfoDraft(formData);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Edit Personal Information
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-8 min-h-0">
                    
                    {/* Basic Info Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b pb-2">Basic Info</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">First Name *</label>
                                <input
                                    type="text"
                                    name="user_fname"
                                    value={formData.user_fname || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Middle Name</label>
                                <input
                                    type="text"
                                    name="user_mname"
                                    value={formData.user_mname || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Last Name *</label>
                                <input
                                    type="text"
                                    name="user_lname"
                                    value={formData.user_lname || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Suffix</label>
                                <input
                                    type="text"
                                    name="suffix_name"
                                    value={formData.suffix_name || ""}
                                    onChange={handleChange}
                                    placeholder="e.g. Jr, Sr, III"
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Nickname</label>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={formData.nickname || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b pb-2">Contact</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Contact Number</label>
                                <input
                                    type="text"
                                    name="user_contact"
                                    value={formData.user_contact || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Personal Details Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b pb-2">Personal Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Birthday</label>
                                <input
                                    type="date"
                                    name="user_bday"
                                    value={formData.user_bday || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Civil Status</label>
                                <select
                                    name="civil_status"
                                    value={formData.civil_status || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="">Select Status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Blood Type</label>
                                <select
                                    name="blood_type"
                                    value={formData.blood_type || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="">Select Type</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Religion</label>
                                <input
                                    type="text"
                                    name="religion"
                                    value={formData.religion || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Nationality</label>
                                <input
                                    type="text"
                                    name="nationality"
                                    value={formData.nationality || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-sm font-medium text-foreground">Place of Birth</label>
                                <input
                                    type="text"
                                    name="place_of_birth"
                                    value={formData.place_of_birth || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-b pb-2">Address</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Province</label>
                                <input
                                    type="text"
                                    name="user_province"
                                    value={formData.user_province || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">City/Municipality</label>
                                <input
                                    type="text"
                                    name="user_city"
                                    value={formData.user_city || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Barangay</label>
                                <input
                                    type="text"
                                    name="user_brgy"
                                    value={formData.user_brgy || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleApply}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Apply Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
