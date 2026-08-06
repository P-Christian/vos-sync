// src/modules/vos-admin/role-matching/components/JobDirectoryTree.tsx

"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, FolderTree, Briefcase, Tag, Loader2 } from "lucide-react";
import { useJobCategories } from "../hooks/useJobCategories";
import { useStandardRoles } from "../hooks/useStandardRoles";

export default function JobDirectoryTree() {
  const { categories, loading: catLoading } = useJobCategories();
  const { roles, loading: rolesLoading } = useStandardRoles();
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });

  const toggleCat = (id: number) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loading = catLoading || rolesLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm text-zinc-500">Building job directory tree…</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
      {categories.map((cat) => {
        const isExpanded = !!expandedCats[cat.category_id];
        const catRoles = roles.filter((r) => r.category_id === cat.category_id || (r.category_code && r.category_code === cat.category_code));

        return (
          <div key={cat.category_id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCat(cat.category_id)}
              className="flex items-center justify-between w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
                <FolderTree className="h-4 w-4 text-indigo-600" />
                <div>
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{cat.category_name}</span>
                  <span className="ml-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {cat.category_code}
                  </span>
                </div>
              </div>
              <span className="text-xs text-zinc-400 font-medium">{catRoles.length} roles</span>
            </button>

            {isExpanded && (
              <div className="p-3 pl-8 bg-white dark:bg-zinc-900 space-y-2 border-t border-zinc-200 dark:border-zinc-800">
                {catRoles.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-1">No roles mapped under this category.</p>
                ) : (
                  catRoles.map((role) => (
                    <div key={role.role_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-xs">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{role.role_name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {role.experience_level}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
