"use client";

// src/modules/client/talent-search/hooks/useTalentSearch.ts

import { useCallback, useState } from "react";
import { TalentCard, TalentFilters, EMPTY_FILTERS } from "../types";
import { buildTalentSearchParams } from "../utils/talentUtils";

const PAGE_LIMIT = 20;

export function useTalentSearch() {
  const [talents, setTalents] = useState<TalentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const [filters, setFilters] = useState<TalentFilters>(EMPTY_FILTERS);
  const [jobIdForMatch, setJobIdForMatch] = useState("");

  const search = useCallback(
    async (overrideFilters?: TalentFilters, overridePage?: number, overrideJobId?: string) => {
      const activeFilters = overrideFilters ?? filters;
      const activePage = overridePage ?? page;
      const activeJobId = overrideJobId ?? jobIdForMatch;

      setLoading(true);
      setError("");

      try {
        const params = buildTalentSearchParams(
          activeFilters.keyword,
          activeFilters.skills,
          activeFilters.location,
          activeFilters.experience_level,
          activeFilters.availability,
          activeFilters.school_id,
          activePage,
          PAGE_LIMIT,
          activeJobId || undefined
        );

        const res = await fetch(`/api/client/talent-search?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load talent.");
        }

        setTalents(json.talents ?? []);
        setTotal(json.total ?? 0);
        setHasSearched(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setLoading(false);
      }
    },
    [filters, page, jobIdForMatch]
  );

  const updateFilter = useCallback(
    <K extends keyof TalentFilters>(key: K, value: TalentFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setJobIdForMatch("");
    setTalents([]);
    setTotal(0);
    setHasSearched(false);
    setError("");
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      search(undefined, newPage);
    },
    [search]
  );

  /** Toggle saved state optimistically */
  const toggleSaved = useCallback((userId: number, isSaved: boolean) => {
    setTalents((prev) =>
      prev.map((t) => (t.user_id === userId ? { ...t, is_saved: isSaved } : t))
    );
  }, []);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return {
    talents,
    loading,
    error,
    total,
    page,
    totalPages,
    hasSearched,
    filters,
    jobIdForMatch,
    setJobIdForMatch,
    updateFilter,
    search,
    resetFilters,
    handlePageChange,
    toggleSaved,
    PAGE_LIMIT,
  };
}
