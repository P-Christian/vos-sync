"use client";

// src/modules/client/settings/components/SecuritySettings.tsx

import React, { useState } from "react";
import { SecurityPayload } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, ShieldCheck, Lock } from "lucide-react";

interface SecuritySettingsProps {
  saving: boolean;
  onChangePassword: (payload: SecurityPayload) => Promise<boolean>;
}

export default function SecuritySettings({
  saving,
  onChangePassword,
}: SecuritySettingsProps) {
  const [form, setForm] = useState<SecurityPayload>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!form.current_password) {
      setLocalError("Current password is required.");
      return;
    }
    if (!form.new_password || form.new_password.length < 8) {
      setLocalError("New password must be at least 8 characters long.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setLocalError("New password and confirm password do not match.");
      return;
    }

    const ok = await onChangePassword(form);
    if (ok) {
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Account Password & Security
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Ensure your account uses a strong, unique password with at least 8 characters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
        {localError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
            {localError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="curr-pass" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-zinc-400" /> Current Password
          </Label>
          <Input
            id="curr-pass"
            type="password"
            value={form.current_password}
            onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
            placeholder="••••••••"
            className="h-10 text-sm rounded-lg"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-pass" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-zinc-400" /> New Password
          </Label>
          <Input
            id="new-pass"
            type="password"
            value={form.new_password}
            onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
            placeholder="Min. 8 characters"
            className="h-10 text-sm rounded-lg"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="conf-pass" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-zinc-400" /> Confirm New Password
          </Label>
          <Input
            id="conf-pass"
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
            placeholder="Re-enter new password"
            className="h-10 text-sm rounded-lg"
            required
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-9 px-6 text-sm rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Updating Password...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
