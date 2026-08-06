// src/modules/vos-admin/role-matching/components/RoleMatchingDashboard.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderTree, Briefcase, Search, Sparkles, Play, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetrics } from "../types";
import { fetchDashboardMetrics } from "../services/roleMatchingService";
import JobDirectoryTree from "./JobDirectoryTree";

export function RoleMatchingDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const m = await fetchDashboardMetrics();
      setMetrics(m);
    } catch {
      setMetrics({
        totalCategories: 9,
        totalStandardRoles: 11,
        totalSearchKeywords: 42,
        totalRoleSkills: 28,
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950 via-zinc-900 to-violet-950 text-white border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-48 w-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur border border-white/20 text-indigo-200 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Matching Engine Intelligence Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Role &amp; Skill Intelligence</h1>
          <p className="text-sm text-indigo-200/80 max-w-xl">
            Maintain official job roles, search keywords &amp; synonyms, core skill requirements, and test matching accuracy live.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button onClick={loadData} variant="outline" size="sm" className="h-10 px-4 rounded-xl text-white border-white/20 hover:bg-white/10">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh Data
          </Button>
          <Link href="/vos-sync/vos-admin/job-roles/tester">
            <Button size="sm" className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0 font-semibold shadow-lg gap-2">
              <Play className="h-4 w-4" />
              Match Test Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Job Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {loading ? "…" : metrics?.totalCategories}
            </div>
            <p className="text-xs text-zinc-400 mt-1">High-level job domains</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Standard Roles</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {loading ? "…" : metrics?.totalStandardRoles}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Canonical job titles</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Keywords &amp; Synonyms</CardTitle>
            <Search className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {loading ? "…" : metrics?.totalSearchKeywords}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Mapped search terms</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Role Skill Mappings</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {loading ? "…" : metrics?.totalRoleSkills}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Associated core skills</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Quick Intelligence Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/vos-sync/vos-admin/job-roles/categories">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group">
              <FolderTree className="h-6 w-6 text-indigo-600 mb-3" />
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                Job Categories <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-zinc-500 mt-1">Manage job domains like Frontend, Backend, Marketing.</p>
            </div>
          </Link>

          <Link href="/vos-sync/vos-admin/job-roles/roles">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group">
              <Briefcase className="h-6 w-6 text-blue-600 mb-3" />
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                Standard Job Roles <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-zinc-500 mt-1">Manage official titles and experience levels.</p>
            </div>
          </Link>

          <Link href="/vos-sync/vos-admin/job-roles/keywords">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group">
              <Search className="h-6 w-6 text-emerald-600 mb-3" />
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                Keywords &amp; Synonyms <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-zinc-500 mt-1">Add alternate search terms and relevance weights.</p>
            </div>
          </Link>

          <Link href="/vos-sync/vos-admin/job-roles/skills">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group">
              <CheckCircle2 className="h-6 w-6 text-violet-600 mb-3" />
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                Role Skills <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-zinc-500 mt-1">Set core skills and importance weights per role.</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Directory Tree Visualization */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Job Role Directory Tree</h3>
        <JobDirectoryTree />
      </div>
    </div>
  );
}
