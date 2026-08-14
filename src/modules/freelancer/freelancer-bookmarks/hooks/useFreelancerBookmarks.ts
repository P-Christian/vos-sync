// src/modules/freelancer/freelancer-bookmarks/hooks/useFreelancerBookmarks.ts
"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
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

  const bookmarkedJobIds = useMemo(() => {
    return bookmarks.map((b) => b.job_id);
  }, [bookmarks]);

  const removeBookmark = useCallback(
    async (jobId: number) => {
      const isBookmarked = bookmarkedJobIds.includes(jobId);
      if (!isBookmarked) return true;

      const snapshot = [...bookmarks];
      setBookmarks((prev) => prev.filter((b) => b.job_id !== jobId));

      try {
        const res = await fetch("/api/freelancer/bookmarks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to remove bookmark.");

        toast.success("Bookmark removed.");
        await fetchBookmarks();
        return true;
      } catch (err: unknown) {
        setBookmarks(snapshot);
        const errorMsg = err instanceof Error ? err.message : "Failed to remove bookmark. Reverting changes...";
        toast.error(errorMsg);
        return false;
      }
    },
    [bookmarkedJobIds, bookmarks, fetchBookmarks]
  );

  /**
   * Standard Optimistic Transaction for Bookmarking Toggle
   * 1. Snapshot previous state
   * 2. Optimistically update local bookmarks list
   * 3. Send POST/DELETE API request
   * 4. If failure: restore exact previous snapshot + toast error
   */
  const toggleBookmark = useCallback(
    async (jobId: number) => {
      const isBookmarked = bookmarkedJobIds.includes(jobId);
      const snapshot = [...bookmarks];

      // 1. Optimistic UI update
      if (isBookmarked) {
        setBookmarks((prev) => prev.filter((b) => b.job_id !== jobId));
      } else {
        const tempItem: BookmarkedJob = {
          bookmark_id: Date.now(),
          job_id: jobId,
          user_id: 0,
          bookmarked_at: new Date().toISOString(),
          job_title: "Loading...",
          company_name: "Loading...",
          company_logo: null,
          job_type: "Full Time",
          work_arrangement: "Remote",
          job_location: "Remote",
        };
        setBookmarks((prev) => [...prev, tempItem]);
      }

      // 2. Perform backend API mutation request
      try {
        const method = isBookmarked ? "DELETE" : "POST";
        const res = await fetch("/api/freelancer/bookmarks", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `Failed to ${isBookmarked ? "remove" : "save"} bookmark.`);
        }

        toast.success(isBookmarked ? "Bookmark removed." : "Job bookmarked!");
        // Re-sync with canonical backend data
        await fetchBookmarks();
        return true;
      } catch (err: unknown) {
        // 3. Rollback UI on failure
        setBookmarks(snapshot);
        const errorMsg = err instanceof Error ? err.message : "Failed to update bookmark. Reverting changes...";
        toast.error(errorMsg);
        return false;
      }
    },
    [bookmarkedJobIds, bookmarks, fetchBookmarks]
  );

  return {
    bookmarks,
    bookmarkedJobIds,
    loading,
    error,
    fetchBookmarks,
    removeBookmark,
    toggleBookmark,
  };
}


