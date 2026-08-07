"use client";

// src/modules/vos-admin/role-matching/hooks/useRoleSkills.ts

import { useState, useCallback, useEffect } from "react";
import { RoleSkillMapping, MasterSkill } from "../types";
import { fetchRoleSkills, createRoleSkill, updateRoleSkill, deleteRoleSkill, fetchMasterSkills } from "../services/roleMatchingService";

export function useRoleSkills(roleId?: number) {
  const [roleSkills, setRoleSkills] = useState<RoleSkillMapping[]>([]);
  const [masterSkills, setMasterSkills] = useState<MasterSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSkills = useCallback(async (rId?: number) => {
    setLoading(true);
    setError("");
    try {
      const [skillsData, mastersData] = await Promise.all([
        fetchRoleSkills(rId ?? roleId),
        fetchMasterSkills().catch(() => []),
      ]);
      setRoleSkills(skillsData);
      setMasterSkills(mastersData);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load role skills.");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  const addRoleSkill = useCallback(async (payload: Partial<RoleSkillMapping>) => {
    try {
      const created = await createRoleSkill(payload);
      setRoleSkills((prev) => [...prev, created]);
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to add role skill.");
      return false;
    }
  }, []);

  const editRoleSkill = useCallback(async (payload: Partial<RoleSkillMapping>) => {
    try {
      const updated = await updateRoleSkill(payload);
      setRoleSkills((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update role skill.");
      return false;
    }
  }, []);

  const removeRoleSkill = useCallback(async (id: number) => {
    try {
      await deleteRoleSkill(id);
      setRoleSkills((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to delete role skill.");
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setLoading(true);
      setError("");
      try {
        const [skillsData, mastersData] = await Promise.all([
          fetchRoleSkills(roleId),
          fetchMasterSkills().catch(() => []),
        ]);
        if (isMounted) {
          setRoleSkills(skillsData);
          setMasterSkills(mastersData);
        }
      } catch (err: unknown) {
        if (isMounted) setError((err as Error).message || "Failed to load role skills.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [roleId]);

  return { roleSkills, masterSkills, loading, error, loadSkills, addRoleSkill, editRoleSkill, removeRoleSkill };
}
