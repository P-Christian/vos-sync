"use client";

// src/modules/vos-admin/role-matching/hooks/useJobCategories.ts

import { useState, useCallback, useEffect } from "react";
import { JobCategory } from "../types";
import { fetchJobCategories, createJobCategory, updateJobCategory, deleteJobCategory } from "../services/roleMatchingService";

export function useJobCategories() {
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJobCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || "Failed to load job categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  const addCategory = useCallback(async (payload: Partial<JobCategory>) => {
    try {
      const created = await createJobCategory(payload);
      setCategories((prev) => [...prev, created]);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to add category.");
      return false;
    }
  }, []);

  const editCategory = useCallback(async (payload: Partial<JobCategory>) => {
    try {
      const updated = await updateJobCategory(payload);
      setCategories((prev) => prev.map((c) => (c.category_id === updated.category_id ? { ...c, ...updated } : c)));
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to update category.");
      return false;
    }
  }, []);

  const removeCategory = useCallback(async (id: number) => {
    try {
      await deleteJobCategory(id);
      setCategories((prev) => prev.filter((c) => c.category_id !== id));
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to delete category.");
      return false;
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return { categories, loading, error, loadCategories, addCategory, editCategory, removeCategory };
}
