"use client";

import React, { useState, useMemo } from "react";
import { usePlatformCompany } from "./hooks/usePlatformCompany";
import { PlatformCompanyCard } from "./components/PlatformCompanyCard";
import { PlatformCompanyModal } from "./components/PlatformCompanyModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Star,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";

export function PlatformCompanyModule() {
  const {
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
  } = usePlatformCompany();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.company_name?.toLowerCase().includes(query) ||
        c.company_legal_name?.toLowerCase().includes(query) ||
        c.company_code?.toLowerCase().includes(query) ||
        c.slug?.toLowerCase().includes(query) ||
        c.company_city?.toLowerCase().includes(query)
    );
  }, [companies, searchQuery]);

  const activeCount = useMemo(
    () => companies.filter((c) => Number(c.is_active) === 1 || c.is_active === true).length,
    [companies]
  );

  const primaryCompany = useMemo(
    () => companies.find((c) => Number(c.is_primary) === 1 || c.is_primary === true),
    [companies]
  );

  return (
    <div className="space-y-6 w-full admin-page-transition">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-violet-950 via-zinc-900 to-indigo-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-48 w-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Company</h1>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl">
              Manage internal operating entities and brand profiles powering landing pages, About Us, and public contact sections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadCompanies}
            disabled={loading}
            className="rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs h-10 px-4"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={openCreateModal}
            className="rounded-full bg-gradient-to-r from-primary to-info text-primary-foreground shadow-lg shadow-primary/30 text-xs h-10 px-5 font-semibold hover:brightness-110"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-primary/10 bg-card/70 backdrop-blur-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Entities</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{companies.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Building className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-primary/10 bg-card/70 backdrop-blur-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Active Profiles</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{activeCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-primary/10 bg-card/70 backdrop-blur-xl flex items-center justify-between shadow-sm">
          <div className="min-w-0 pr-2">
            <p className="text-xs text-muted-foreground font-medium">Primary Entity</p>
            <p className="text-sm font-bold text-foreground truncate mt-1">
              {primaryCompany ? primaryCompany.company_name : "None designated"}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Star className="h-5 w-5 fill-amber-500/30" />
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search Filter Toolbar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Filter by name, code, slug, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 rounded-full border-primary/15 bg-card/80 backdrop-blur-md text-xs focus-visible:ring-primary/20"
        />
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" role="status" aria-busy="true">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-primary/10 bg-card/70 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-14 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-primary/20 bg-card/40 backdrop-blur-md text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base text-foreground">
            {searchQuery ? "No companies match your filter" : "No platform companies yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search keywords."
              : "Create your first internal operating company profile to power landing pages and about sections."}
          </p>
          {!searchQuery && (
            <Button
              type="button"
              size="sm"
              onClick={openCreateModal}
              className="rounded-full text-xs h-9 bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Platform Company
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCompanies.map((company) => (
            <PlatformCompanyCard
              key={company.company_id}
              company={company}
              onEdit={openEditModal}
              onSetPrimary={handleSetPrimary}
              onToggleActive={handleToggleActive}
              disabled={saving}
            />
          ))}
        </div>
      )}

      {/* Modal Editor */}
      <PlatformCompanyModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={saveCompany}
        company={editingCompany}
        saving={saving}
      />
    </div>
  );
}
export default PlatformCompanyModule;
