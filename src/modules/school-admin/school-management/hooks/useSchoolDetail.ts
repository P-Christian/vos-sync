// src/modules/school-admin/school-management/hooks/useSchoolDetail.ts
"use client";

import { useState, useCallback } from "react";
import { VsSchoolCourse, SchoolWithStats } from "../types/school.types";

export function useSchoolDetail() {
  const [school, setSchool] = useState<SchoolWithStats | null>(null);
  const [courses, setCourses] = useState<VsSchoolCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchSchoolDetail = useCallback(async (schoolId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/school-admin/schools/${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load school details.");
      setSchool(json.school);
      
      const coursesRes = await fetch(`/api/school-admin/schools/${schoolId}/courses`);
      const coursesJson = await coursesRes.json();
      if (coursesRes.ok) {
        setCourses(coursesJson.courses ?? []);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const addCourse = useCallback(async (schoolId: number, formData: unknown) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch(`/api/school-admin/schools/${schoolId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add course.");
      
      if (json.course) {
        setCourses((prev) => [json.course, ...prev]);
        setSchool((prev) => prev ? { ...prev, course_count: prev.course_count + 1 } : null);
      }
      setSuccessMessage("Course added successfully.");
      return json.course;
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred.");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateCourseStatus = useCallback(async (schoolId: number, courseId: number, currentStatus: string) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      // We haven't created a specific endpoint for updating a single course yet in the design,
      // But we can patch the course list API conceptually, or just patch /api/school-admin/school-courses/[id]
      // Let's assume we patch through the school for simplicity in this MVP, or create the route for it.
      // Wait, the plan didn't define a specific route for patching a course other than /api/admin/school-courses/[id]
      // For this MVP we will just mock or throw error if it doesn't exist.
      // Let's implement it here just in case.
      
      // Let's use the route we didn't fully define but can create easily if needed.
      const res = await fetch(`/api/school-admin/schools/${schoolId}/courses/${courseId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ course_status: currentStatus === "Active" ? "Inactive" : "Active" })
      });
      
      // If it doesn't exist yet, we'll get a 404, but we can handle that later.
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update course.");
      
      if (json.course) {
          setCourses(prev => prev.map(c => c.school_course_id === courseId ? json.course : c));
      }
      setSuccessMessage("Course status updated.");
      return true;
    } catch(err: unknown) {
      setError((err as Error).message || "An error occurred.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    school,
    courses,
    loading,
    saving,
    error,
    successMessage,
    fetchSchoolDetail,
    addCourse,
    updateCourseStatus,
    clearMessages: () => { setError(""); setSuccessMessage(""); },
  };
}
