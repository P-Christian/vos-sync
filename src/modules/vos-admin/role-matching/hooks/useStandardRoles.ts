"use client";

// src/modules/vos-admin/role-matching/hooks/useStandardRoles.ts

import { useState, useCallback, useEffect } from "react";
import { StandardRole } from "../types";
import { fetchStandardRoles, createStandardRole, updateStandardRole, deleteStandardRole } from "../services/roleMatchingService";

export function useStandardRoles(categoryId?: number) {
  const [roles, setRoles] = useState<StandardRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRoles = useCallback(async (catId?: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStandardRoles(catId ?? categoryId);
      setRoles(data);
    } catch (err: any) {
      setError(err.message || "Failed to load standard roles.");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const addRole = useCallback(async (payload: Partial<StandardRole>) => {
    try {
      const created = await createStandardRole(payload);
      setRoles((prev) => [...prev, created]);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to add standard role.");
      return false;
    }
  }, []);

  const editRole = useCallback(async (payload: Partial<StandardRole>) => {
    try {
      const updated = await updateStandardRole(payload);
      setRoles((prev) => prev.map((r) => (r.role_id === updated.role_id ? { ...r, ...updated } : r)));
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to update standard role.");
      return false;
    }
  }, []);

  const removeRole = useCallback(async (roleId: number) => {
    try {
      await deleteStandardRole(roleId);
      setRoles((prev) => prev.filter((r) => r.role_id !== roleId));
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to delete standard role.");
      return false;
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  return { roles, loading, error, loadRoles, addRole, editRole, removeRole };
}
