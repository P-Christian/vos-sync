// src/modules/freelancer/freelancer-bookmarks/FreelancerBookmarksPage.tsx
"use client";

import React, { useEffect } from 'react';
import { useFreelancerBookmarks } from './hooks/useFreelancerBookmarks';
import { BookmarkHeader } from './components/BookmarkHeader';
import { BookmarkList } from './components/BookmarkList';

const FreelancerBookmarksPage: React.FC = () => {
  const {
    bookmarks,
    loading,
    error,
    fetchBookmarks,
    removeBookmark,
  } = useFreelancerBookmarks();

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return (
    <div className="w-full p-6 sm:p-8">
      <BookmarkHeader />

      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 bg-card rounded-xl border shadow-sm mb-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-zinc-400 animate-pulse">Loading saved jobs...</span>
        </div>
      ) : (
        <BookmarkList bookmarks={bookmarks} onRemoveBookmark={removeBookmark} />
      )}
    </div>
  );
};

export default FreelancerBookmarksPage;
