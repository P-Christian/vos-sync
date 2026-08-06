"use client";

// src/modules/client/talent-search/components/TalentSearchBar.tsx

import React from "react";
import { Search, X,  } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TalentSearchBarProps {
  keyword: string;
  jobIdForMatch: string;
  onKeywordChange: (v: string) => void;
  onJobIdChange: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
  loading: boolean;
}

export default function TalentSearchBar({
  keyword,
  jobIdForMatch,
  onKeywordChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onJobIdChange,
  onSearch,
  onReset,
  loading,
}: TalentSearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <div className="flex flex-col gap-3 !mb-0">
      {/* Primary search */}
      <div className="relative flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <Input
            id="talent-search-keyword"
            placeholder="Search by name, skill, title, school…"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-11 rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
          />
          {keyword && (
            <button
              onClick={() => onKeywordChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          id="talent-search-btn"
          onClick={onSearch}
          disabled={loading}
          className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm border-0 gap-2 shrink-0"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>

        {(keyword || jobIdForMatch) && (
          <Button
            id="talent-search-reset"
            variant="outline"
            onClick={onReset}
            className="h-11 px-4 rounded-xl text-sm shrink-0"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* AI Match by Job ID */}
      {/* <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
        
          <Input
            id="talent-ai-match-job-id"
            placeholder="Enter Job ID to auto-filter best matches"
            value={jobIdForMatch}
            onChange={(e) => onJobIdChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 h-9 rounded-lg border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-xs placeholder:text-violet-400"
          />
        </div>
        <span className="text-xs text-zinc-400">
          Provide a Job ID to score candidates against your job requirements
        </span>
      </div> */}
    </div>
  );
}
