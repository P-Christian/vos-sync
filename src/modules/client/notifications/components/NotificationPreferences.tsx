"use client";

// src/modules/client/notifications/components/NotificationPreferences.tsx

import React, { useMemo, useState } from "react";
import { Loader2, Mail, Smartphone, AlertCircle, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  NotificationPreference,
  NOTIFICATION_CATEGORY_LABELS,
} from "../types";

interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
  loading: boolean;
  saving: boolean;
  error: string;
  onSave: (updated: Partial<NotificationPreference>[]) => Promise<boolean>;
}

export default function NotificationPreferences({
  preferences,
  loading,
  saving,
  error,
  onSave,
}: NotificationPreferencesProps) {
  // Derive draft from props; local overrides track unsaved changes
  const [overrides, setOverrides] = useState<Map<string, Partial<NotificationPreference>>>(
    () => new Map()
  );
  const [saved, setSaved] = useState(false);

  const draft: NotificationPreference[] = useMemo(
    () =>
      preferences.map((p) => ({
        ...p,
        ...(overrides.get(p.category) ?? {}),
      })),
    [preferences, overrides]
  );

  const handleToggle = (
    category: string,
    field: "email_enabled" | "in_app_enabled",
    value: boolean
  ) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(category, { ...(next.get(category) ?? {}), [field]: value });
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    const ok = await onSave(
      draft.map((p) => ({
        category: p.category,
        email_enabled: p.email_enabled,
        in_app_enabled: p.in_app_enabled,
      }))
    );
    if (ok) {
      setOverrides(new Map()); // reset overrides after save
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        <span className="text-sm text-zinc-400">Loading preferences...</span>
      </div>
    );
  }

  if (draft.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-zinc-400">
        No notification preferences configured yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Column headers */}
      <div className="flex items-center px-1">
        <div className="flex-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
          Category
        </div>
        <div className="flex items-center gap-6 pr-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 w-20 justify-center">
            <Mail className="h-3.5 w-3.5" />
            Email
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 w-20 justify-center">
            <Smartphone className="h-3.5 w-3.5" />
            In-App
          </span>
        </div>
      </div>

      {/* Preference rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {draft.map((pref) => {
          const label =
            NOTIFICATION_CATEGORY_LABELS[pref.category] ?? pref.category;

          return (
            <div
              key={pref.category}
              className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {label}
              </span>

              <div className="flex items-center gap-6">
                <div className="w-20 flex justify-center">
                  <Switch
                    id={`email-${pref.category}`}
                    checked={pref.email_enabled}
                    onCheckedChange={(val) =>
                      handleToggle(pref.category, "email_enabled", val)
                    }
                    disabled={saving}
                  />
                </div>
                <div className="w-20 flex justify-center">
                  <Switch
                    id={`inapp-${pref.category}`}
                    checked={pref.in_app_enabled}
                    onCheckedChange={(val) =>
                      handleToggle(pref.category, "in_app_enabled", val)
                    }
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 px-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 px-1">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          Preferences saved successfully.
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-6 text-sm rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white border-0 font-medium shadow-sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </div>
  );
}
