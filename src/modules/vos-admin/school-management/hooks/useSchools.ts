// src/modules/vos-admin/school-management/hooks/useSchools.ts
"use client";

import { useState, useCallback } from "react";
import { SchoolWithStats } from "../types/school.types";

export function useSchools() {
  const [schools, setSchools] = useState<SchoolWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [filterStatus, setFilterStatus] = useState<string | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSchools = useCallback(async (status?: string, search?: string) => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (status && status !== "ALL") queryParams.append("status", status);
      if (search) queryParams.append("search", search);
      
      const q = queryParams.toString() ? `?${queryParams.toString()}` : "";
      
      const res = await fetch(`/api/vos-admin/schools${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load schools.");
      setSchools(json.schools ?? []);
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchool = useCallback(async (formData: unknown) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/vos-admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create school.");
      
      setSuccessMessage("School created successfully.");
      return json.school;
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred.");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateSchool = useCallback(async (schoolId: number, formData: unknown) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch(`/api/vos-admin/schools/${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update school.");
      
      if (json.school) {
        setSchools((prev) =>
          prev.map((s) => (s.school_id === schoolId ? { ...s, ...json.school } : s))
        );
      }
      setSuccessMessage("School updated successfully.");
      return json.school;
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred.");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleStatus = useCallback(async (schoolId: number, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    return updateSchool(schoolId, { school_status: newStatus });
  }, [updateSchool]);

  return {
    schools,
    loading,
    saving,
    error,
    successMessage,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    fetchSchools,
    createSchool,
    updateSchool,
    toggleStatus,
    clearMessages: () => { setError(""); setSuccessMessage(""); },
  };
}
