"use client";

import React, { useMemo } from "react";
import { usePlatformCompany } from "./hooks/usePlatformCompany";
import { SinglePlatformCompanyEditor } from "./components/SinglePlatformCompanyEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export function PlatformCompanyModule() {
  const {
    companies,
    loading,
    saving,
    error,
    successMessage,
    loadCompanies,
    saveCompany,
  } = usePlatformCompany();

  const primaryCompany = useMemo(
    () => companies.find((c) => Number(c.is_primary) === 1 || c.is_primary === true) || companies[0],
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
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Company Profile</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="h-3 w-3" /> Single Entity
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
              Internal operating profile powering brand identity, customer support hours, values, and marketing copy across VOS Sync public pages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              await loadCompanies();
              toast.info("Refreshed platform company profile.");
            }}
            disabled={loading || saving}
            className="rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs h-10 px-4"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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

      {/* Editor Content */}
      {loading ? (
        <div className="p-6 rounded-3xl border border-primary/10 bg-card/70 space-y-6" role="status" aria-busy="true">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
          <div className="space-y-4 pt-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      ) : primaryCompany ? (
        <SinglePlatformCompanyEditor
          company={primaryCompany}
          onSave={async (data) => {
            await saveCompany(data, primaryCompany.company_id);
          }}
          saving={saving}
        />
      ) : (
        <div className="p-12 rounded-3xl border border-dashed border-primary/20 bg-card/40 backdrop-blur-md text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base text-foreground">No platform company record found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Directus could not find any platform company record. Please refresh or verify the Directus connection.
          </p>
        </div>
      )}
    </div>
  );
}

export default PlatformCompanyModule;

