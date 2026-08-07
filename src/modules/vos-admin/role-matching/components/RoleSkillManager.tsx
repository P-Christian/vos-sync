// src/modules/vos-admin/role-matching/components/RoleSkillManager.tsx

"use client";

import React, { useState } from "react";
import { CheckCircle2, Plus, Loader2, ShieldAlert, Star, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRoleSkills } from "../hooks/useRoleSkills";
import { useStandardRoles } from "../hooks/useStandardRoles";
import { RoleSkillMapping } from "../types";

export function RoleSkillManager() {
  const { roles } = useStandardRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const { roleSkills, masterSkills, loading, error, addRoleSkill, editRoleSkill, removeRoleSkill } = useRoleSkills(selectedRoleId);

  const [openModal, setOpenModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<RoleSkillMapping | null>(null);

  const [targetRoleId, setTargetRoleId] = useState<number>(1);
  const [skillId, setSkillId] = useState<number>(1);
  const [weight, setWeight] = useState<number>(1.0);
  const [isRequired, setIsRequired] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingSkill(null);
    setTargetRoleId(roles[0]?.role_id || 1);
    setSkillId(masterSkills[0]?.id || 1);
    setWeight(1.0);
    setIsRequired(true);
    setFormError("");
    setOpenModal(true);
  };

  const openEditModal = (s: RoleSkillMapping) => {
    setEditingSkill(s);
    setTargetRoleId(s.role_id);
    setSkillId(s.skill_id);
    setWeight(s.importance_weight ?? 1.0);
    setIsRequired(!!s.is_required);
    setFormError("");
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!targetRoleId || !skillId) {
      setFormError("Standard Role and Skill selection are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    let ok = false;
    if (editingSkill) {
      ok = await editRoleSkill({
        id: editingSkill.id,
        role_id: targetRoleId,
        skill_id: skillId,
        importance_weight: weight,
        is_required: isRequired,
      });
    } else {
      ok = await addRoleSkill({
        role_id: targetRoleId,
        skill_id: skillId,
        importance_weight: weight,
        is_required: isRequired,
      });
    }

    setSubmitting(false);
    if (ok) {
      setOpenModal(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this role skill mapping?")) {
      await removeRoleSkill(id);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-violet-600" />
            Role Skills &amp; Requirements
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Associate core skills to standard job roles with importance weights &amp; requirement types.</p>
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
          <Button onClick={openCreateModal} className="h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs gap-2 border-0">
            <Plus className="h-4 w-4" />
            Add Role Skill
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
              <th className="p-4">Mapping ID</th>
              <th className="p-4">Standard Role</th>
              <th className="p-4">Associated Skill</th>
              <th className="p-4">Importance Weight</th>
              <th className="p-4">Requirement Type</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading role skills…
                </td>
              </tr>
            ) : roleSkills.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400">
                  No role skills mapped yet.
                </td>
              </tr>
            ) : (
              roleSkills.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="p-4 font-mono text-zinc-400">#{s.id}</td>
                  <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">{s.role_name || s.role_id}</td>
                  <td className="p-4 text-violet-600 dark:text-violet-400 font-semibold">{s.skill_name || s.skill_id}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                      {Math.round((s.importance_weight ?? 1.0) * 100)}%
                    </span>
                  </td>
                  <td className="p-4">
                    {s.is_required ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                        <Star className="h-3 w-3 fill-rose-500 text-rose-500" /> Core Required
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Bonus / Optional
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(s)} className="h-7 w-7 p-0 text-zinc-500 hover:text-violet-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="h-7 w-7 p-0 text-zinc-500 hover:text-rose-600">
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
              {editingSkill ? `Edit Role Skill Mapping #${editingSkill.id}` : "Add Skill to Standard Role"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            {formError && <p className="text-rose-600 text-xs font-semibold">{formError}</p>}
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Standard Role</label>
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
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Skill</label>
              <select
                value={skillId}
                onChange={(e) => setSkillId(Number(e.target.value))}
                className="w-full h-9 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 font-medium"
              >
                {masterSkills.length > 0 ? (
                  masterSkills.map((m) => (
                    <option key={m.id} value={m.id}>{m.skill_name}</option>
                  ))
                ) : (
                  <>
                    <option value={1}>React</option>
                    <option value={2}>Next.js</option>
                    <option value={3}>TypeScript</option>
                    <option value={4}>Tailwind CSS</option>
                    <option value={5}>Node.js</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Importance Weight</label>
                <span className="font-bold text-violet-600">{Math.round(weight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="isRequired" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500" />
              <label htmlFor="isRequired" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Core Required Skill for this Role</label>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setOpenModal(false)} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={submitting} className="h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingSkill ? "Update Skill Mapping" : "Save Role Skill"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
