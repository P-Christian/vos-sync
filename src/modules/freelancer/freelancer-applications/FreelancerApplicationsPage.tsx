"use client";

import React, { useEffect, useState } from 'react';
import { useFreelancerApplications } from './hooks/useFreelancerApplications';
import { ApplicationHeader } from './components/ApplicationHeader';
import { ApplicationSummaryCards } from './components/ApplicationSummaryCards';
import { ApplicationTable } from './components/ApplicationTable';
import { ApplicationTips } from './components/ApplicationTips';
import { AIPromotionCard } from './components/AIPromotionCard';

// Imports for the merged Bookmarks view
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFreelancerBookmarks } from './hooks/useFreelancerBookmarks';
import { BookmarkList } from './components/BookmarkList';
import { BookmarkHeader } from './components/BookmarkHeader';
import { Input } from '@/components/ui/input';
import { Search, ClipboardList } from 'lucide-react';

interface FreelancerApplicationsPageProps {
  defaultTab?: "applications" | "bookmarks";
}

const FreelancerApplicationsPage: React.FC<FreelancerApplicationsPageProps> = ({ 
  defaultTab = "applications" 
}) => {
  const {
    applications,
    summary,
    loading,
    error,
    fetchApplications,
    filterStatus,
    setFilterStatus,
  } = useFreelancerApplications();

  const {
    bookmarks,
    loading: bookmarksLoading,
    error: bookmarksError,
    fetchBookmarks,
    removeBookmark,
  } = useFreelancerBookmarks();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [bookmarkSearch, setBookmarkSearch] = useState("");

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const query = bookmarkSearch.toLowerCase();
    return (
      (bookmark.job_title?.toLowerCase() || "").includes(query) ||
      (bookmark.company_name?.toLowerCase() || "").includes(query)
    );
  });

  // Read URL query parameter safely on mount to check if we should default to Bookmarks tab
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "saved") {
        setActiveTab("bookmarks");
      }
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    fetchBookmarks();
  }, [fetchApplications, fetchBookmarks]);

  return (
    <div className="w-full p-6 sm:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-emerald-950 via-zinc-900 to-teal-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Applications & Saved Jobs</h1>
            <p className="text-sm text-zinc-300 mt-1">
              Track your active job applications and manage bookmarked opportunities.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "applications" | "bookmarks")} className="w-full">
        <TabsList className="mb-6 bg-muted/60 p-1 border">
          <TabsTrigger value="applications" className="px-4 py-2 font-semibold">
            Job Applications
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="px-4 py-2 font-semibold">
            Saved Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="outline-none">
          <ApplicationHeader 
            totalOpportunities={summary.totalApplied} 
            filterStatus={filterStatus} 
            onFilterChange={setFilterStatus} 
          />
          <ApplicationSummaryCards summary={summary} />

          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 bg-card rounded-xl border shadow-sm mb-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-zinc-400 animate-pulse">Loading applications...</span>
            </div>
          ) : (
            <div className="mb-8">
              <ApplicationTable applications={applications} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookmarks" className="outline-none">
          <BookmarkHeader />

          <div className="mb-6 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search saved jobs..."
                value={bookmarkSearch}
                onChange={(e) => setBookmarkSearch(e.target.value)}
                className="rounded-lg pl-8"
              />
            </div>
          </div>

          {bookmarksError && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
              {bookmarksError}
            </div>
          )}

          {bookmarksLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 bg-card rounded-xl border shadow-sm mb-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-zinc-400 animate-pulse">Loading saved jobs...</span>
            </div>
          ) : (
            <div className="mb-8">
              <BookmarkList bookmarks={filteredBookmarks} onRemoveBookmark={removeBookmark} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <ApplicationTips />
        </div>
        <div className="md:col-span-1">
          <AIPromotionCard />
        </div>
      </div>
    </div>
  );
};

export default FreelancerApplicationsPage;
