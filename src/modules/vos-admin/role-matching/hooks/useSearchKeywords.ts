"use client";

// src/modules/vos-admin/role-matching/hooks/useSearchKeywords.ts

import { useState, useCallback, useEffect } from "react";
import { SearchKeyword } from "../types";
import { fetchSearchKeywords, createSearchKeyword, updateSearchKeyword, deleteSearchKeyword } from "../services/roleMatchingService";

export function useSearchKeywords(roleId?: number) {
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadKeywords = useCallback(async (rId?: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSearchKeywords(rId ?? roleId);
      setKeywords(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load search keywords.");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  const addKeyword = useCallback(async (payload: Partial<SearchKeyword>) => {
    try {
      const created = await createSearchKeyword(payload);
      setKeywords((prev) => [...prev, created]);
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to add search keyword.");
      return false;
    }
  }, []);

  const editKeyword = useCallback(async (payload: Partial<SearchKeyword>) => {
    try {
      const updated = await updateSearchKeyword(payload);
      setKeywords((prev) => prev.map((k) => (k.alias_id === updated.alias_id ? { ...k, ...updated } : k)));
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update search keyword.");
      return false;
    }
  }, []);

  const removeKeyword = useCallback(async (aliasId: number) => {
    try {
      await deleteSearchKeyword(aliasId);
      setKeywords((prev) => prev.filter((k) => k.alias_id !== aliasId));
      return true;
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to delete search keyword.");
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchSearchKeywords(roleId);
        if (isMounted) setKeywords(data);
      } catch (err: unknown) {
        if (isMounted) setError((err as Error).message || "Failed to load search keywords.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [roleId]);

  return { keywords, loading, error, loadKeywords, addKeyword, editKeyword, removeKeyword };
}
