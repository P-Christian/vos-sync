"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./local-dialog";
import { toast } from "sonner";
import { useFreelancerProfileContext } from "../providers/FreelancerProfileProvider";
import { VsEducation } from "../types/freelancer-profile.types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CreateSchoolRequestModal } from "@/modules/school-admin/request-management/components/CreateSchoolRequestModal";
import { CreateCourseRequestModal } from "@/modules/school-admin/request-management/components/CreateCourseRequestModal";

interface EducationModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    educationToEdit?: VsEducation | null;
}

export function EducationModal({ isOpen, onClose, userId, educationToEdit }: EducationModalProps) {
    const [schoolId, setSchoolId] = useState<string>("");
    const [courseId, setCourseId] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    
    const [schools, setSchools] = useState<any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */>([]);
    const [courses, setCourses] = useState<any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */>([]);
    const [loadingSchools, setLoadingSchools] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);
    
    const [showSchoolRequest, setShowSchoolRequest] = useState(false);
    const [showCourseRequest, setShowCourseRequest] = useState(false);

    const { data, pendingEducation, setEducationDraft } = useFreelancerProfileContext();
    const liveEducation = data?.education || [];
    const educationList = pendingEducation !== null ? pendingEducation : liveEducation;

    useEffect(() => {
        if (isOpen) {
            fetchSchools();
            if (educationToEdit) {
                setSchoolId(educationToEdit.school_id ? String(educationToEdit.school_id) : "");
                setCourseId(educationToEdit.school_course_id ? String(educationToEdit.school_course_id) : "");
                setStartDate(educationToEdit.start_date ? educationToEdit.start_date.split("T")[0] : "");
                setEndDate(educationToEdit.end_date ? educationToEdit.end_date.split("T")[0] : "");
            } else {
                setSchoolId("");
                setCourseId("");
                setStartDate("");
                setEndDate("");
            }
        }
    }, [isOpen, educationToEdit]);

    useEffect(() => {
        if (schoolId) {
            fetchCourses(schoolId);
        } else {
            setCourses([]);
        }
    }, [schoolId]);

    const fetchSchools = async () => {
        setLoadingSchools(true);
        try {
            const res = await fetch("/api/freelancer/schools");
            const json = await res.json();
            if (json.schools) setSchools(json.schools);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSchools(false);
        }
    };

    const fetchCourses = async (sId: string) => {
        setLoadingCourses(true);
        try {
            const res = await fetch(`/api/freelancer/schools/${sId}/courses`);
            const json = await res.json();
            if (json.courses) setCourses(json.courses);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleSave = async () => {
        if (!schoolId) {
            toast.error("Please select a school.");
            return;
        }

        if (!courseId) {
            toast.error("Please select a course/degree. If it's missing, you can request to add it.");
            return;
        }

        const payload = {
            school_id: parseInt(schoolId, 10),
            school_course_id: courseId ? parseInt(courseId, 10) : null,
            start_date: startDate || null,
            end_date: endDate || null,
            school_name: schools.find(s => String(s.school_id) === schoolId)?.school_name,
            course_name: courses.find(c => String(c.school_course_id) === courseId)?.course_name,
        };

        const updatedList = [...educationList];

        if (educationToEdit) {
            const index = updatedList.findIndex(e => e.id === educationToEdit.id);
            if (index >= 0) {
                updatedList[index] = { ...updatedList[index], ...payload } as VsEducation;
            }
        } else {
            updatedList.push({
                id: -Math.floor(Math.random() * 1000000), // temp id
                user_id: userId,
                ...payload
            } as VsEducation);
        }

        setEducationDraft(updatedList);
        onClose();
    };

    const handleDelete = () => {
        if (!educationToEdit) return;
        if (!confirm("Are you sure you want to delete this education record?")) return;
        
        const updatedList = educationList.filter(e => e.id !== educationToEdit.id);
        setEducationDraft(updatedList);
        onClose();
    };

    const handleSchoolRequestSubmit = async (data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
        const res = await fetch("/api/freelancer/school-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return res.ok;
    };

    const handleCourseRequestSubmit = async (data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
        const payload = { ...data, school_id: parseInt(schoolId, 10) };
        const res = await fetch("/api/freelancer/course-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        return res.ok;
    };

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                    <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl font-semibold text-foreground">
                            {educationToEdit ? "Edit Education" : "Add Education"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">School Name *</label>
                            <div className="flex gap-2 flex-col">
                                <SearchableSelect
                                    options={schools.map(s => ({ value: String(s.school_id), label: s.school_name }))}
                                    value={schoolId}
                                    onValueChange={(val) => { setSchoolId(val); setCourseId(""); }}
                                    placeholder={loadingSchools ? "Loading schools..." : "Search for your school..."}
                                    disabled={loadingSchools}
                                />
                                <div className="text-xs text-muted-foreground mt-1 text-right">
                                    Can&apos;t find your school? <button type="button" onClick={() => setShowSchoolRequest(true)} className="text-primary font-medium hover:underline">Request to add it</button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Course / Degree (Optional)</label>
                            <div className="flex gap-2 flex-col">
                                <SearchableSelect
                                    options={courses.map(c => ({ value: String(c.school_course_id), label: c.course_name }))}
                                    value={courseId}
                                    onValueChange={setCourseId}
                                    placeholder={loadingCourses ? "Loading courses..." : (schoolId ? "Search courses..." : "Select a school first")}
                                    disabled={!schoolId || loadingCourses}
                                />
                                {schoolId && (
                                    <div className="text-xs text-muted-foreground mt-1 text-right">
                                        Can&apos;t find your course? <button type="button" onClick={() => setShowCourseRequest(true)} className="text-primary font-medium hover:underline">Request to add it</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Start Date (Optional)</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t flex justify-end gap-3 shrink-0 bg-muted/20">
                        {educationToEdit && (
                            <Button variant="destructive" onClick={handleDelete} className="mr-auto">Delete</Button>
                        )}
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Save Education
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <CreateSchoolRequestModal 
                open={showSchoolRequest} 
                onOpenChange={setShowSchoolRequest} 
                onSubmit={handleSchoolRequestSubmit} 
            />
            {schoolId && (
                <CreateCourseRequestModal 
                    open={showCourseRequest} 
                    onOpenChange={setShowCourseRequest} 
                    onSubmit={handleCourseRequestSubmit} 
                    defaultSchoolId={parseInt(schoolId, 10)}
                    hideSchoolSelect={true}
                />
            )}
        </>
    );
}
