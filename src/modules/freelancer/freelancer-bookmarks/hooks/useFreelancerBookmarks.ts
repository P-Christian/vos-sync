// src/modules/freelancer/freelancer-bookmarks/hooks/useFreelancerBookmarks.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { BookmarkedJob } from "../types";

export function useFreelancerBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/freelancer/bookmarks");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load bookmarks.");
      setBookmarks(json.bookmarks ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  const addBookmark = useCallback(async (jobId: number) => {
    try {
      const res = await fetch("/api/freelancer/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to bookmark job.");
      // Optimistically fetch to update list, or we can just append if we have full details
      // Better to re-fetch to ensure we have all enriched data
      await fetchBookmarks();
      return true;
    } catch (err: unknown) {
      console.error(err);
      return false;
    }
  }, [fetchBookmarks]);

  const removeBookmark = useCallback(async (jobId: number) => {
    try {
      // Optimistically remove from local state
      setBookmarks((prev) => prev.filter((b) => b.job_id !== jobId));
      
      const res = await fetch("/api/freelancer/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove bookmark.");
      return true;
    } catch (err: unknown) {
      console.error(err);
      // Revert if failed
      await fetchBookmarks();
      return false;
    }
  }, [fetchBookmarks]);

  const bookmarkedJobIds = useMemo(() => {
    return bookmarks.map((b) => b.job_id);
  }, [bookmarks]);

  const toggleBookmark = useCallback(async (jobId: number) => {
    if (bookmarkedJobIds.includes(jobId)) {
      await removeBookmark(jobId);
    } else {
      await addBookmark(jobId);
    }
  }, [bookmarkedJobIds, addBookmark, removeBookmark]);

  // Optionally fetch on mount, or leave it to the consumer
  // useEffect(() => {
  //   fetchBookmarks();
  // }, [fetchBookmarks]);

  return {
    bookmarks,
    bookmarkedJobIds,
    loading,
    error,
    fetchBookmarks,
    addBookmark,
    removeBookmark,
    toggleBookmark,
  };
}
