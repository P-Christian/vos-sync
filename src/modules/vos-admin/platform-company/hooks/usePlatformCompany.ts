"use client"

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { PlatformCompany, PlatformCompanyFormData } from "../types/platformCompany.types";
import {
  fetchPlatformCompanies,
  updatePlatformCompany,
  setPrimaryPlatformCompany,
} from "../services/platformCompany.service";

export function usePlatformCompany() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCompany, setEditingCompany] = useState<PlatformCompany | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    clearMessages();
    try {
      const res = await fetchPlatformCompanies();
      setCompanies(res.data ?? []);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to load platform companies");
      toast.error(e.message || "Failed to load platform companies");
    } finally {
      setLoading(false);
    }
  }, [clearMessages]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetchPlatformCompanies();
        if (!ignore) {
          setCompanies(res.data ?? []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const e = err as Error;
          setError(e.message || "Failed to load platform companies");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const openCreateModal = useCallback(() => {
    clearMessages();
    setEditingCompany(null);
    setIsModalOpen(true);
  }, [clearMessages]);

  const openEditModal = useCallback(
    (company: PlatformCompany) => {
      clearMessages();
      setEditingCompany(company);
      setIsModalOpen(true);
    },
    [clearMessages]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingCompany(null);
  }, []);

  const saveCompany = useCallback(
    async (formData: PlatformCompanyFormData, targetCompanyId?: number) => {
      setSaving(true);
      clearMessages();
      try {
        const idToUpdate = targetCompanyId ?? formData.company_id ?? editingCompany?.company_id ?? companies[0]?.company_id;
        await updatePlatformCompany(formData, idToUpdate);
        const msg = `Updated "${formData.company_name}" successfully.`;
        setSuccessMessage(msg);
        toast.success(msg);
        setIsModalOpen(false);
        setEditingCompany(null);
        await loadCompanies();
      } catch (err: unknown) {
        const e = err as Error;
        const msg = e.message || "Failed to save platform company details";
        setError(msg);
        toast.error(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [editingCompany, companies, clearMessages, loadCompanies]
  );

  const handleSetPrimary = useCallback(
    async (company: PlatformCompany) => {
      clearMessages();
      try {
        await setPrimaryPlatformCompany(company.company_id);
        const msg = `Set "${company.company_name}" as the primary company.`;
        setSuccessMessage(msg);
        toast.success(msg);
        await loadCompanies();
      } catch (err: unknown) {
        const e = err as Error;
        const msg = e.message || "Failed to update primary company status";
        setError(msg);
        toast.error(msg);
      }
    },
    [clearMessages, loadCompanies]
  );

  const handleToggleActive = useCallback(
    async (company: PlatformCompany) => {
      clearMessages();
      const currentActive = Number(company.is_active) === 1 || company.is_active === true;
      const nextActive = !currentActive;
      try {
        await updatePlatformCompany(company.company_id, { is_active: nextActive ? 1 : 0 });
        const msg = `Company "${company.company_name}" is now ${nextActive ? "Active" : "Archived"}.`;
        setSuccessMessage(msg);
        toast.success(msg);
        await loadCompanies();
      } catch (err: unknown) {
        const e = err as Error;
        const msg = e.message || "Failed to update active status";
        setError(msg);
        toast.error(msg);
      }
    },
    [clearMessages, loadCompanies]
  );

  return {
    companies,
    loading,
    saving,
    error,
    successMessage,
    isModalOpen,
    editingCompany,
    loadCompanies,
    openCreateModal,
    openEditModal,
    closeModal,
    saveCompany,
    handleSetPrimary,
    handleToggleActive,
    clearMessages,
  };
}
