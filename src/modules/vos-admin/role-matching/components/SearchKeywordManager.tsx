// src/modules/vos-admin/role-matching/components/SearchKeywordManager.tsx

"use client";

import React, { useState } from "react";
import { Search, Plus, Loader2, Check, ShieldAlert, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchKeywords } from "../hooks/useSearchKeywords";
import { useStandardRoles } from "../hooks/useStandardRoles";
import { normalizeKeyword, validateKeywordInput } from "../validators";
import { SearchKeyword } from "../types";

export function SearchKeywordManager() {
  const { roles } = useStandardRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const { keywords, loading, error, addKeyword, editKeyword, removeKeyword } = useSearchKeywords(selectedRoleId);

  const [openModal, setOpenModal] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<SearchKeyword | null>(null);

  const [aliasName, setAliasName] = useState("");
  const [targetRoleId, setTargetRoleId] = useState<number>(1);
  const [weight, setWeight] = useState<number>(1.0);
  const [isPrimary, setIsPrimary] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingKeyword(null);
    setAliasName("");
    setTargetRoleId(roles[0]?.role_id || 1);
    setWeight(1.0);
    setIsPrimary(false);
    setFormError("");
    setOpenModal(true);
  };

  const openEditModal = (k: SearchKeyword) => {
    setEditingKeyword(k);
    setAliasName(k.alias_name);
    setTargetRoleId(k.role_id);
    setWeight(k.match_weight ?? 1.0);
    setIsPrimary(!!k.is_primary);
    setFormError("");
    setOpenModal(true);
  };

  const handleSave = async () => {
    const valid = validateKeywordInput(aliasName, targetRoleId);
    if (!valid.valid) {
      setFormError(valid.error || "Invalid input");
      return;
    }

    setSubmitting(true);
    setFormError("");

    let ok = false;
    if (editingKeyword) {
      ok = await editKeyword({
        alias_id: editingKeyword.alias_id,
        alias_name: aliasName.trim(),
        normalized_alias: normalizeKeyword(aliasName),
        role_id: targetRoleId,
        match_weight: weight,
        is_primary: isPrimary,
      });
    } else {
      ok = await addKeyword({
        alias_name: aliasName.trim(),
        normalized_alias: normalizeKeyword(aliasName),
        role_id: targetRoleId,
        match_weight: weight,
        is_primary: isPrimary,
      });
    }

    setSubmitting(false);
    if (ok) {
      setOpenModal(false);
    }
  };

  const handleDelete = async (aliasId: number) => {
    if (confirm("Are you sure you want to delete this search keyword?")) {
      await removeKeyword(aliasId);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-600" />
            Search Keywords &amp; Synonyms
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Map search terms recruiters use to official standard roles with relevance weights.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedRoleId ?? ""}
            onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 text-xs rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 font-medium"
          >
            <option value="">All Standard Roles</option>
            {roles.map((r) => (
              <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
            ))}
          </select>
          <Button onClick={openCreateModal} className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 border-0">
            <Plus className="h-4 w-4" />
            Add Search Keyword
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider text-zinc-500 font-bold">
            <tr>
              <th className="p-4">Alias ID</th>
              <th className="p-4">Search Keyword / Alias</th>
              <th className="p-4">Normalized Alias</th>
              <th className="p-4">Target Standard Role</th>
              <th className="p-4">Match Weight</th>
              <th className="p-4">Primary</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading search keywords…
                </td>
              </tr>
            ) : keywords.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400">
                  No search keywords found.
                </td>
              </tr>
            ) : (
              keywords.map((k) => (
                <tr key={k.alias_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="p-4 font-mono text-zinc-400">#{k.alias_id}</td>
                  <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">{k.alias_name}</td>
                  <td className="p-4 font-mono text-zinc-500">{k.normalized_alias}</td>
                  <td className="p-4 text-indigo-600 dark:text-indigo-400 font-semibold">{k.role_name || k.role_id}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {Math.round(k.match_weight * 100)}%
                    </span>
                  </td>
                  <td className="p-4">
                    {k.is_primary ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                        <Check className="h-3 w-3" /> Primary
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-[11px]">Synonym</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(k)} className="h-7 w-7 p-0 text-zinc-500 hover:text-emerald-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(k.alias_id)} className="h-7 w-7 p-0 text-zinc-500 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingKeyword ? `Edit Keyword #${editingKeyword.alias_id}` : "Add Search Keyword & Synonym"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            {formError && <p className="text-rose-600 text-xs font-semibold">{formError}</p>}
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Search Keyword / Synonym</label>
              <Input placeholder="e.g. React Developer" value={aliasName} onChange={(e) => setAliasName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Target Standard Role</label>
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(Number(e.target.value))}
                className="w-full h-9 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 font-medium"
              >
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Match Weight (Relevance)</label>
                <span className="font-bold text-emerald-600">{Math.round(weight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="isPrimary" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
              <label htmlFor="isPrimary" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Set as Primary Canonical Title</label>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setOpenModal(false)} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={submitting} className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingKeyword ? "Update Keyword" : "Save Search Keyword"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
