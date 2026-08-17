"use client";

// src/modules/vos-admin/role-matching/components/JobDirectoryTree.tsx

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Briefcase,
  Search,
  CheckCircle2,
  Loader2,
  Sparkles,
  Tag,
} from "lucide-react";
import { useJobCategories } from "../hooks/useJobCategories";
import { useStandardRoles } from "../hooks/useStandardRoles";
import { useSearchKeywords } from "../hooks/useSearchKeywords";
import { useRoleSkills } from "../hooks/useRoleSkills";

export default function JobDirectoryTree() {
  const { categories, loading: catLoading } = useJobCategories();
  const { roles, loading: rolesLoading } = useStandardRoles();
  const { keywords, loading: kwLoading } = useSearchKeywords();
  const { roleSkills, loading: skillsLoading } = useRoleSkills();

  // Category-level expansion state (open first 3 by default)
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  // Role-level expansion state (collapsed by default for clean view)
  const [expandedRoles, setExpandedRoles] = useState<Record<number, boolean>>({});

  const toggleCat = (id: number) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRole = (roleId: number) => {
    setExpandedRoles((prev) => ({ ...prev, [roleId]: !prev[roleId] }));
  };

  // Group keywords by role_id
  const keywordsByRole = useMemo(() => {
    const map = new Map<number, typeof keywords>();
    for (const kw of keywords) {
      const list = map.get(kw.role_id) || [];
      list.push(kw);
      map.set(kw.role_id, list);
    }
    return map;
  }, [keywords]);

  // Group role skills by role_id
  const skillsByRole = useMemo(() => {
    const map = new Map<number, typeof roleSkills>();
    for (const rs of roleSkills) {
      const list = map.get(rs.role_id) || [];
      list.push(rs);
      map.set(rs.role_id, list);
    }
    return map;
  }, [roleSkills]);

  const loading = catLoading || rolesLoading || kwLoading || skillsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm text-zinc-500">Building matching taxonomy tree…</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
      {categories.map((cat) => {
        const isCatExpanded = !!expandedCats[cat.category_id];
        const catRoles = roles.filter(
          (r) =>
            r.category_id === cat.category_id ||
            (r.category_code && r.category_code === cat.category_code)
        );

        return (
          <div
            key={cat.category_id}
            className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs"
          >
            {/* Category Header Bar */}
            <button
              type="button"
              onClick={() => toggleCat(cat.category_id)}
              className="flex items-center justify-between w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isCatExpanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
                <FolderTree className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {cat.category_name}
                  </span>
                  <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {cat.category_code}
                  </span>
                </div>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium shrink-0 ml-2">
                {catRoles.length} {catRoles.length === 1 ? "role" : "roles"}
              </span>
            </button>

            {/* Roles List */}
            {isCatExpanded && (
              <div className="p-3 sm:p-4 space-y-2.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                {catRoles.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-2 pl-6">
                    No canonical roles mapped under this category.
                  </p>
                ) : (
                  catRoles.map((role) => {
                    const isRoleExpanded = !!expandedRoles[role.role_id];
                    const rSkills = skillsByRole.get(role.role_id) || [];
                    const rKeywords = keywordsByRole.get(role.role_id) || [];

                    return (
                      <div
                        key={role.role_id}
                        className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden transition-all bg-zinc-50/40 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        {/* Role Row */}
                        <button
                          type="button"
                          onClick={() => toggleRole(role.role_id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-3 gap-2 text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isRoleExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            )}
                            <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {role.role_name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                              {role.experience_level}
                            </span>
                          </div>

                          {/* Compact Counts Indicator */}
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pl-6 sm:pl-0 shrink-0 font-medium">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-violet-500" />
                              {rSkills.length} {rSkills.length === 1 ? "skill" : "skills"}
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Search className="h-3 w-3 text-emerald-500" />
                              {rKeywords.length} {rKeywords.length === 1 ? "keyword" : "keywords"}
                            </span>
                          </div>
                        </button>

                        {/* Role Expanded Details (Core Skills + Keywords) */}
                        {isRoleExpanded && (
                          <div className="p-4 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-4 bg-white dark:bg-zinc-950/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* ── Core Skills Block ─────────────────── */}
                              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 space-y-2.5">
                                <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
                                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                                    Core Skills ({rSkills.length})
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium">Weight</span>
                                </div>

                                {rSkills.length === 0 ? (
                                  <p className="text-[11px] text-zinc-400 py-1 italic">
                                    No core skills mapped yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {rSkills.map((s) => {
                                      const pct = Math.round(Number(s.importance_weight ?? 1.0) * 100);
                                      return (
                                        <div
                                          key={s.id}
                                          className="flex items-center justify-between text-xs gap-2"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                              {s.skill_name || `Skill #${s.skill_id}`}
                                            </span>
                                            {Boolean(s.is_required) && (
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
                                                REQ
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                            {/* Visual Weight Bar */}
                                            <div className="w-16 sm:w-20 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, pct)}%` }}
                                              />
                                            </div>
                                            <span className="text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-300 w-8 text-right">
                                              {pct}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* ── Keywords & Synonyms Block ────────── */}
                              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 space-y-2.5">
                                <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
                                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                                    <Search className="h-3.5 w-3.5 text-emerald-500" />
                                    Keywords &amp; Synonyms ({rKeywords.length})
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium">Match</span>
                                </div>

                                {rKeywords.length === 0 ? (
                                  <p className="text-[11px] text-zinc-400 py-1 italic">
                                    No keywords mapped yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {rKeywords.map((kw) => {
                                      const matchPct = Math.round(Number(kw.match_weight ?? 1.0) * 100);
                                      return (
                                        <div
                                          key={kw.alias_id}
                                          className="flex items-center justify-between text-xs gap-2"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                              {kw.alias_name}
                                            </span>
                                            {Boolean(kw.is_primary) && (
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                                                PRIMARY
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0">
                                            {/* Visual Match Bar */}
                                            <div className="w-16 sm:w-20 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, matchPct)}%` }}
                                              />
                                            </div>
                                            <span className="text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-300 w-8 text-right">
                                              {matchPct}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
