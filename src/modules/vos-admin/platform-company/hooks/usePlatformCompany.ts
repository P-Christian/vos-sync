"use client"

import { useState, useCallback, useEffect } from "react";
import { PlatformCompany, PlatformCompanyFormData } from "../types/platformCompany.types";
import {
  fetchPlatformCompanies,
  createPlatformCompany,
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
    async (formData: PlatformCompanyFormData) => {
      setSaving(true);
      clearMessages();
      try {
        if (editingCompany) {
          await updatePlatformCompany(editingCompany.company_id, formData);
          setSuccessMessage(`Updated "${formData.company_name}" successfully.`);
        } else {
          await createPlatformCompany(formData);
          setSuccessMessage(`Created "${formData.company_name}" successfully.`);
        }
        setIsModalOpen(false);
        setEditingCompany(null);
        await loadCompanies();
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || "Failed to save platform company details");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [editingCompany, clearMessages, loadCompanies]
  );

  const handleSetPrimary = useCallback(
    async (company: PlatformCompany) => {
      clearMessages();
      try {
        await setPrimaryPlatformCompany(company.company_id);
        setSuccessMessage(`Set "${company.company_name}" as the primary company.`);
        await loadCompanies();
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || "Failed to update primary company status");
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
        setSuccessMessage(
          `Company "${company.company_name}" is now ${nextActive ? "Active" : "Archived"}.`
        );
        await loadCompanies();
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || "Failed to update active status");
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
