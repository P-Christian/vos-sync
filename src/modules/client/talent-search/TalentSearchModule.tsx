"use client";

// src/modules/client/talent-search/TalentSearchModule.tsx

import React, { useState, useCallback } from "react";
import {
  Search, Users, Bookmark, AlertCircle, ChevronLeft, ChevronRight,
  SlidersHorizontal, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import CompanyVerificationGuard from "../components/CompanyVerificationGuard";

import TalentSearchBar from "./components/TalentSearchBar";
import TalentFiltersPanel from "./components/TalentFilters";
import TalentCardComponent from "./components/TalentCard";
import TalentProfileDrawer from "./components/TalentProfileDrawer";
import SavedTalentPanel from "./components/SavedTalentPanel";
import InviteDialog from "./components/InviteDialog";

import { useTalentSearch } from "./hooks/useTalentSearch";
import { useTalentProfile } from "./hooks/useTalentProfile";
import { useSavedTalent } from "./hooks/useSavedTalent";

import { TalentCard, TalentProfile } from "./types";

export default function TalentSearchModule() {
  const {
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
  } = useTalentSearch();

  const {
    profile: drawerProfile,
    loading: drawerLoading,
    error: drawerError,
    fetchProfile,
    clearProfile,
  } = useTalentProfile();

  const {
    saved,
    loading: savedLoading,
    saving,
    error: savedError,
    fetchSaved,
    saveTalent,
    unsaveTalent,
    sendInvitation,
    clearError: clearSavedError,
  } = useSavedTalent();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<TalentCard | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ userId: number; name: string } | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ── handlers ────────────────────────────────

  const handleViewProfile = useCallback(
    (talent: TalentCard) => {
      setActiveCard(talent);
      fetchProfile(talent.user_id);
      setDrawerOpen(true);
    },
    [fetchProfile]
  );

  const handleDrawerViewById = useCallback(
    (userId: number) => {
      fetchProfile(userId);
      setDrawerOpen(true);
    },
    [fetchProfile]
  );

  const handleToggleSave = useCallback(
    async (talent: TalentCard) => {
      if (talent.is_saved) {
        const ok = await unsaveTalent(talent.user_id);
        if (ok) toggleSaved(talent.user_id, false);
      } else {
        const ok = await saveTalent(talent.user_id);
        if (ok) toggleSaved(talent.user_id, true);
      }
    },
    [saveTalent, unsaveTalent, toggleSaved]
  );

  const handleDrawerToggleSave = useCallback(
    async (p: TalentProfile) => {
      if (p.is_saved) {
        await unsaveTalent(p.user_id);
      } else {
        await saveTalent(p.user_id);
      }
      // re-fetch profile to update saved state
      fetchProfile(p.user_id);
    },
    [saveTalent, unsaveTalent, fetchProfile]
  );

  const handleOpenInvite = useCallback(
    (userId: number, name: string) => {
      setInviteTarget({ userId, name });
      clearSavedError();
      setInviteOpen(true);
    },
    [clearSavedError]
  );

  const handleDrawerInvite = useCallback(
    (p: TalentProfile) => {
      handleOpenInvite(p.user_id, p.name);
    },
    [handleOpenInvite]
  );

  const handleSendInvitation = useCallback(
    async (message: string, jobId?: number) => {
      if (!inviteTarget) return;
      const ok = await sendInvitation(inviteTarget.userId, message, jobId);
      if (ok) setInviteOpen(false);
    },
    [inviteTarget, sendInvitation]
  );

  const handleSearch = useCallback(() => {
    search(undefined, 1);
  }, [search]);

  return (
    <CompanyVerificationGuard moduleName="Talent Search">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4 md:space-y-6"
      >
        {/* ── Header ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-card via-card/90 to-muted/40 p-6 sm:p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 h-48 w-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-8 bottom-0 h-32 w-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-primary/10 text-primary backdrop-blur rounded-2xl border border-primary/20">
              <Search className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Talent Search</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Discover and connect with professionals, freelancers &amp; students
              </p>
            </div>
          </div>

          {/* Stats */}
          {hasSearched && (
            <div className="flex gap-4 md:gap-6 relative z-10">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{total}</p>
                <p className="text-sm md:text-xs text-muted-foreground">Profiles Found</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{saved.length}</p>
                <p className="text-sm md:text-xs text-muted-foreground">Saved</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Main Content ─────────────────────────── */}
        <Tabs defaultValue="search" className="space-y-4">
          <TabsList className="h-10 max-md:min-h-10 bg-muted/80 backdrop-blur-sm rounded-xl p-1 w-fit border border-border">
            <TabsTrigger value="search" className="rounded-lg text-sm max-md:text-xs gap-2 px-4 max-md:px-3">
              <Search className="h-4 w-4" />
              Search Talent
            </TabsTrigger>
            <TabsTrigger value="saved" className="rounded-lg text-sm max-md:text-xs gap-2 px-4 max-md:px-3">
              <Bookmark className="h-4 w-4" />
              Saved
              {saved.length > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">
                  {saved.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── SEARCH TAB ────────────────────────── */}
          <TabsContent value="search">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-4 md:gap-6"
            >
              {/* Sidebar filters — desktop */}
              <div className="hidden lg:flex flex-col w-64 shrink-0">
                <div className="sticky top-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 shadow-sm">
                  <TalentFiltersPanel
                    filters={filters}
                    onFilterChange={updateFilter}
                    onApply={handleSearch}
                  />
                </div>
              </div>

              {/* Results area */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Search bar */}
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 max-md:p-3 shadow-sm space-y-3">
                  <TalentSearchBar
                    keyword={filters.keyword}
                    jobIdForMatch={jobIdForMatch}
                    onKeywordChange={(v) => updateFilter("keyword", v)}
                    onJobIdChange={setJobIdForMatch}
                    onSearch={handleSearch}
                    onReset={resetFilters}
                    loading={loading}
                  />

                  {/* Mobile filter toggle */}
                  <div className="flex lg:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMobileFiltersOpen((v) => !v)}
                      className="h-8 max-md:min-h-10 text-xs gap-1.5 rounded-lg"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filters
                    </Button>
                  </div>

                  {/* Mobile filters panel */}
                  <AnimatePresence>
                    {mobileFiltersOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden border-t border-border pt-3 relative overflow-hidden"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-3 right-0 h-7 w-7 max-md:size-10 p-0 rounded-full"
                          onClick={() => setMobileFiltersOpen(false)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <TalentFiltersPanel
                          filters={filters}
                          onFilterChange={updateFilter}
                          onApply={() => {
                            handleSearch();
                            setMobileFiltersOpen(false);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Error */}
                {error && !loading && (
                  <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Results count */}
                {hasSearched && !loading && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Showing <strong className="text-foreground">{talents.length}</strong> of{" "}
                      <strong className="text-foreground">{total}</strong> profiles
                    </span>
                    {totalPages > 1 && (
                      <span>Page {page} of {totalPages}</span>
                    )}
                  </div>
                )}

                {/* State Transitions: Loading Skeleton, Empty State, Initial State, Results */}
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading-skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-border bg-card p-5 space-y-3 animate-pulse"
                        >
                          <div className="flex gap-3">
                            <div className="h-12 w-12 rounded-xl bg-muted shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3.5 bg-muted rounded w-3/4" />
                              <div className="h-3 bg-muted/60 rounded w-1/2" />
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {[1, 2, 3].map((j) => (
                              <div key={j} className="h-6 w-14 rounded-full bg-muted/80" />
                            ))}
                          </div>
                          <div className="h-3 bg-muted/60 rounded w-full" />
                          <div className="h-3 bg-muted/60 rounded w-4/5" />
                        </div>
                      ))}
                    </motion.div>
                  ) : hasSearched && talents.length === 0 && !error ? (
                    <motion.div
                      key="empty-state"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-base font-semibold text-foreground">No profiles found</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Try adjusting your search keywords or filters to find more candidates.
                      </p>
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="mt-4 rounded-xl text-sm max-md:min-h-10 max-md:px-3 max-md:text-xs"
                      >
                        Clear All Filters
                      </Button>
                    </motion.div>
                  ) : !hasSearched && !error ? (
                    <motion.div
                      key="initial-state"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="relative mb-6">
                        <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                          <Search className="h-10 w-10 text-primary-foreground" />
                        </div>
                        <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          AI
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-foreground">
                        Find Your Next Hire
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                        Search by name, skill, job title, or school.
                      </p>
                      <Button
                        onClick={handleSearch}
                        className="mt-6 h-11 px-8 rounded-xl font-semibold text-sm gap-2"
                      >
                        <Search className="h-4 w-4" />
                        Browse All Talent
                      </Button>
                    </motion.div>
                  ) : talents.length > 0 ? (
                    <motion.div
                      key="results-grid"
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0 }}
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.04,
                          },
                        },
                      }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {talents.map((talent) => (
                        <TalentCardComponent
                          key={talent.user_id}
                          talent={talent}
                          onViewProfile={handleViewProfile}
                          onToggleSave={handleToggleSave}
                          saving={saving}
                        />
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4 max-md:flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="h-9 max-md:min-h-10 px-3 rounded-xl text-sm max-md:text-xs gap-1.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pg = Math.max(1, page - 2) + i;
                        if (pg > totalPages) return null;
                        return (
                          <Button
                            key={pg}
                            variant={pg === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pg)}
                            className={cn(
                              "h-9 w-9 max-md:size-10 p-0 rounded-xl text-sm max-md:text-xs",
                              pg === page ? "bg-primary text-primary-foreground border-0" : ""
                            )}
                          >
                            {pg}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="h-9 max-md:min-h-10 px-3 rounded-xl text-sm max-md:text-xs gap-1.5"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* ── SAVED TAB ─────────────────────────── */}
          <TabsContent value="saved">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 max-md:p-4 shadow-sm"
            >
              <SavedTalentPanel
                saved={saved}
                loading={savedLoading}
                error={savedError}
                onFetch={fetchSaved}
                onView={handleDrawerViewById}
                onUnsave={async (userId) => {
                  await unsaveTalent(userId);
                  fetchSaved();
                }}
                onInvite={handleOpenInvite}
                unsaving={saving}
              />
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* ── Profile Drawer ────────────────────── */}
        <TalentProfileDrawer
          open={drawerOpen}
          profile={drawerProfile}
          matchScore={activeCard?.match_score}
          matchBreakdown={activeCard?.match_breakdown}
          aiExplanation={activeCard?.ai_explanation ?? null}
          searchKeyword={filters.keyword}
          loading={drawerLoading}
          error={drawerError}
          onClose={() => {
            setDrawerOpen(false);
            clearProfile();
            setActiveCard(null);
          }}
          onToggleSave={handleDrawerToggleSave}
          onInvite={handleDrawerInvite}
          saving={saving}
        />

        {/* ── Invite Dialog ─────────────────────── */}
        {inviteTarget && (
          <InviteDialog
            open={inviteOpen}
            talentName={inviteTarget.name}
            onClose={() => setInviteOpen(false)}
            onSend={handleSendInvitation}
            sending={saving}
            error={savedError}
          />
        )}
      </motion.div>
    </CompanyVerificationGuard>
  );
}
