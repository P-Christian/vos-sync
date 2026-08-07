"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { VsJobPreferences } from "../types/freelancer-profile.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { fetchProvinces, fetchCities, PsgcItem } from "@/lib/psgc";

interface JobPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPreferences: Partial<VsJobPreferences>;
    userId: number;
}

export function JobPreferencesModal({ isOpen, onClose, initialPreferences }: JobPreferencesModalProps) {
    const { setJobPreferencesDraft, pendingJobPreferences } = useFreelancerProfileContext();
    
    const [preferences, setPreferences] = useState<Partial<VsJobPreferences>>({});

    const [provinces, setProvinces] = useState<PsgcItem[]>([]);
    const [cities, setCities] = useState<PsgcItem[]>([]);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
    const [selectedCityCode, setSelectedCityCode] = useState("");
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreferences(pendingJobPreferences !== null ? pendingJobPreferences : initialPreferences);
        }
    }, [isOpen, pendingJobPreferences, initialPreferences]);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;
        async function loadProvinces() {
            try {
                const data = await fetchProvinces();
                if (!isMounted) return;
                setProvinces(data);
                setLocationError(null);
            } catch (err) {
                if (isMounted) setLocationError("Failed to load provinces from PSGC.");
            }
        }
        loadProvinces();
        return () => { isMounted = false; };
    }, [isOpen]);

    // Re-hydrate selected codes when modal opens or provinces load
    useEffect(() => {
        if (provinces.length > 0 && preferences.preferred_location) {
            const parts = preferences.preferred_location.split(",").map(s => s.trim());
            const provStr = parts.length > 1 ? parts[1] : parts[0];
            const matchedProv = provinces.find(p => p.name === provStr);
            if (matchedProv && matchedProv.code !== selectedProvinceCode) {
                setSelectedProvinceCode(matchedProv.code);
            }
        }
    }, [provinces, preferences.preferred_location]);

    useEffect(() => {
        if (!selectedProvinceCode) {
            setCities([]);
            return;
        }
        let isMounted = true;
        async function loadCities() {
            try {
                const data = await fetchCities(selectedProvinceCode);
                if (!isMounted) return;
                setCities(data);
                setLocationError(null);
            } catch (err) {
                if (isMounted) setLocationError("Failed to load cities from PSGC.");
            }
        }
        loadCities();
        return () => { isMounted = false; };
    }, [selectedProvinceCode]);

    useEffect(() => {
        if (cities.length > 0 && preferences.preferred_location) {
            const parts = preferences.preferred_location.split(",").map(s => s.trim());
            const cityStr = parts.length > 1 ? parts[0] : "";
            if (cityStr) {
                const matchedCity = cities.find(c => c.name === cityStr);
                if (matchedCity && matchedCity.code !== selectedCityCode) {
                    setSelectedCityCode(matchedCity.code);
                }
            }
        }
    }, [cities, preferences.preferred_location]);

    if (!isOpen) return null;

    const handleSave = () => {
        setJobPreferencesDraft({
            ...preferences,
            updated_at: new Date().toISOString()
        });
        onClose();
    };

    const handleChange = (field: keyof VsJobPreferences, value: string | number | null | undefined) => {
        setPreferences(prev => ({ ...prev, [field]: value }));
    };

    const handleProvinceChange = (code: string) => {
        const selected = provinces.find(p => p.code === code);
        setSelectedProvinceCode(code);
        setSelectedCityCode("");
        if (selected) {
            handleChange("preferred_location", selected.name);
        } else {
            handleChange("preferred_location", "");
        }
    };

    const handleCityChange = (code: string) => {
        const selectedCity = cities.find(c => c.code === code);
        const selectedProv = provinces.find(p => p.code === selectedProvinceCode);
        setSelectedCityCode(code);
        
        if (selectedCity && selectedProv) {
            handleChange("preferred_location", `${selectedCity.name}, ${selectedProv.name}`);
        } else if (selectedProv) {
            handleChange("preferred_location", selectedProv.name);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-background rounded-xl shadow-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-foreground">Edit Job Preferences</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Job Type</label>
                            <Select 
                                value={preferences.job_type || ""} 
                                onValueChange={(val) => handleChange("job_type", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select job type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Full-time">Full-time</SelectItem>
                                    <SelectItem value="Part-time">Part-time</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Freelance">Freelance</SelectItem>
                                    <SelectItem value="Internship">Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Work Setup</label>
                            <Select 
                                value={preferences.work_setup || ""} 
                                onValueChange={(val) => handleChange("work_setup", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select work setup" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Remote">Remote</SelectItem>
                                    <SelectItem value="On-site">On-site</SelectItem>
                                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium">Preferred Location</label>
                            {locationError && (
                                <div className="p-2 bg-destructive/10 text-destructive rounded-md text-xs">
                                    {locationError}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <Select 
                                    value={selectedProvinceCode} 
                                    onValueChange={handleProvinceChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Province" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {provinces.map(p => (
                                            <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                <Select 
                                    value={selectedCityCode} 
                                    onValueChange={handleCityChange}
                                    disabled={!selectedProvinceCode || cities.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select City/Municipality" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map(c => (
                                            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Preferred Industry</label>
                            <Input 
                                value={preferences.preferred_industry || ""} 
                                onChange={(e) => handleChange("preferred_industry", e.target.value)}
                                placeholder="e.g. Technology, Healthcare, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Minimum Salary</label>
                            <Input 
                                type="text"
                                value={preferences.salary_range_min !== null && preferences.salary_range_min !== undefined ? preferences.salary_range_min.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""} 
                                onChange={(e) => {
                                    const numericStr = e.target.value.replace(/[^\d]/g, "");
                                    handleChange("salary_range_min", numericStr ? Number(numericStr) : null);
                                }}
                                placeholder="Min expected salary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Maximum Salary</label>
                            <Input 
                                type="text"
                                value={preferences.salary_range_max !== null && preferences.salary_range_max !== undefined ? preferences.salary_range_max.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""} 
                                onChange={(e) => {
                                    const numericStr = e.target.value.replace(/[^\d]/g, "");
                                    handleChange("salary_range_max", numericStr ? Number(numericStr) : null);
                                }}
                                placeholder="Max expected salary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Currency</label>
                            <Select 
                                value={preferences.currency || "PHP"} 
                                onValueChange={(val) => handleChange("currency", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PHP">PHP (₱)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                                    <SelectItem value="SGD">SGD (S$)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Availability</label>
                            <Select 
                                value={preferences.availability || ""} 
                                onValueChange={(val) => handleChange("availability", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select availability" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Immediate">Immediate</SelectItem>
                                    <SelectItem value="1 Week Notice">1 Week Notice</SelectItem>
                                    <SelectItem value="2 Weeks Notice">2 Weeks Notice</SelectItem>
                                    <SelectItem value="1 Month Notice">1 Month Notice</SelectItem>
                                    <SelectItem value="Not Looking">Not Looking currently</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t flex justify-end gap-3 bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Draft
                    </Button>
                </div>
            </div>
        </div>
    );
}
