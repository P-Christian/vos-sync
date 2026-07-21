/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { UserSearchResult } from "../types";

export function useUserSearch(query: string) {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/shared/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Search failed");
        
        setResults(data.results || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred during search.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400); // Debounce by 400ms

    return () => clearTimeout(timer);
  }, [query]);

  return { results, isLoading, error };
}
