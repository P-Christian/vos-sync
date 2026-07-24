"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Mail, Smartphone, AlertCircle, CheckCircle, BellRing, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  NotificationPreference,
  NOTIFICATION_CATEGORY_LABELS,
  NotificationCategoryGroup,
} from "@/modules/client/notifications/types";

const FREELANCER_NOTIFICATION_CATEGORIES_BY_GROUP: NotificationCategoryGroup[] = [
  {
    title: "Job Applications",
    description: "Notifications regarding your submitted job applications and status changes.",
    categories: [
      { category: "APPLICATION_STATUS_UPDATED", label: "Job application status changes", defaultEmail: true, defaultInApp: true },
    ],
  },
  {
    title: "Interviews",
    description: "Notifications for scheduled, rescheduled, and cancelled interviews.",
    categories: [
      { category: "INTERVIEW_SCHEDULED", label: "New interview scheduled", defaultEmail: true, defaultInApp: true },
      { category: "INTERVIEW_RESCHEDULED", label: "Interview rescheduled", defaultEmail: true, defaultInApp: true },
      { category: "INTERVIEW_CANCELLED", label: "Interview cancelled", defaultEmail: true, defaultInApp: true },
    ],
  },
  {
    title: "Messages",
    description: "Notifications for communication with clients and employers.",
    categories: [
      { category: "MESSAGE_RECEIVED", label: "New message received", defaultEmail: true, defaultInApp: true },
      { category: "UNREAD_MESSAGE_REMINDER", label: "Unread message reminders", defaultEmail: true, defaultInApp: true },
    ],
  },
  {
    title: "Marketing & Updates",
    description: "Product feature announcements and promotional emails.",
    categories: [
      { category: "PRODUCT_UPDATES", label: "Product updates & announcements", defaultEmail: false, defaultInApp: true },
      { category: "MARKETING_UPDATES", label: "Promotional and marketing emails", defaultEmail: false, defaultInApp: false },
    ],
  },
];

interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
  loading: boolean;
  saving: boolean;
  error: string;
  onSave: (updated: Partial<NotificationPreference>[]) => Promise<boolean>;
}

export default function FreelancerNotificationPreferences({
  preferences,
  loading,
  saving,
  error,
  onSave,
}: NotificationPreferencesProps) {
  // Global email master switch state
  const [globalEmailEnabled, setGlobalEmailEnabled] = useState(true);

  // Derive draft from props; local overrides track unsaved changes
  const [overrides, setOverrides] = useState<Map<string, Partial<NotificationPreference>>>(
    () => new Map()
  );
  const [saved, setSaved] = useState(false);

  const draftMap = useMemo(() => {
    const map = new Map<string, NotificationPreference>();
    preferences.forEach((p) => {
      map.set(p.category, {
        ...p,
        ...(overrides.get(p.category) ?? {}),
      });
    });
    return map;
  }, [preferences, overrides]);

  const handleToggle = (
    category: string,
    field: "email_enabled" | "in_app_enabled",
    value: boolean
  ) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = draftMap.get(category) ?? {
        user_id: 0,
        category,
        email_enabled: true,
        in_app_enabled: true,
      };
      next.set(category, {
        ...current,
        [field]: value,
      });
      return next;
    });
    setSaved(false);
  };

  const handleMasterEmailToggle = (enabled: boolean) => {
    setGlobalEmailEnabled(enabled);
    setOverrides((prev) => {
      const next = new Map(prev);
      FREELANCER_NOTIFICATION_CATEGORIES_BY_GROUP.flatMap((g) => g.categories).forEach((item) => {
        const current = draftMap.get(item.category) ?? {
          user_id: 0,
          category: item.category,
          email_enabled: item.defaultEmail,
          in_app_enabled: item.defaultInApp,
        };
        next.set(item.category, {
          ...current,
          email_enabled: enabled ? item.defaultEmail : false,
        });
      });
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    const allCategories = FREELANCER_NOTIFICATION_CATEGORIES_BY_GROUP.flatMap((g) => g.categories.map((c) => c.category));
    
    // Combine known categories and any existing legacy categories
    const payload: Partial<NotificationPreference>[] = [];

    // All categories in draftMap or known categories
    const categoryKeys = Array.from(new Set([...allCategories, ...Array.from(draftMap.keys())]));

    categoryKeys.forEach((cat) => {
      const item = draftMap.get(cat);
      if (item) {
        payload.push({
          category: cat,
          email_enabled: globalEmailEnabled ? item.email_enabled : false,
          in_app_enabled: item.in_app_enabled,
        });
      }
    });

    const ok = await onSave(payload);
    if (ok) {
      setOverrides(new Map());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-zinc-400">Loading notification preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
        <BellRing className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-zinc-950 dark:text-zinc-200">
            Freelancer Notification Center
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage how and when you receive emails and in-app alerts for job status updates, interview schedules, and platform communications.
          </p>
        </div>
      </div>

      {/* Global Email Switch */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Receive email notifications
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Master toggle for all email alerts across all categories
          </p>
        </div>
        <Switch
          id="global-email-toggle"
          checked={globalEmailEnabled}
          onCheckedChange={handleMasterEmailToggle}
          disabled={saving}
        />
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between px-2 pt-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
        <span>Notification Category</span>
        <div className="flex items-center gap-8 pr-2">
          <span className="w-16 text-center flex items-center justify-center gap-1">
            <Mail className="h-3 w-3" /> Email
          </span>
          <span className="w-16 text-center flex items-center justify-center gap-1">
            <Smartphone className="h-3 w-3" /> In-App
          </span>
        </div>
      </div>

      {/* Grouped Notification Categories */}
      {FREELANCER_NOTIFICATION_CATEGORIES_BY_GROUP.map((group) => (
        <div
          key={group.title}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm space-y-0"
        >
          {/* Section Header */}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {group.title}
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{group.description}</p>
          </div>

          {/* Items List */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {group.categories.map((catItem) => {
              const pref = draftMap.get(catItem.category) ?? {
                user_id: 0,
                category: catItem.category,
                email_enabled: catItem.defaultEmail,
                in_app_enabled: catItem.defaultInApp,
              };

              const emailActive = globalEmailEnabled && pref.email_enabled;
              const labelText = NOTIFICATION_CATEGORY_LABELS[catItem.category] ?? catItem.label;

              return (
                <div
                  key={catItem.category}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {labelText}
                  </span>

                  <div className="flex items-center gap-8 pr-2">
                    {/* Email Switch */}
                    <div className="w-16 flex justify-center">
                      <Switch
                        id={`email-${catItem.category}`}
                        checked={emailActive}
                        onCheckedChange={(val) =>
                          handleToggle(catItem.category, "email_enabled", val)
                        }
                        disabled={saving || !globalEmailEnabled}
                      />
                    </div>

                    {/* In-App Switch */}
                    <div className="w-16 flex justify-center">
                      <Switch
                        id={`inapp-${catItem.category}`}
                        checked={pref.in_app_enabled}
                        onCheckedChange={(val) =>
                          handleToggle(catItem.category, "in_app_enabled", val)
                        }
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Feedback Messages */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 px-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 px-1">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Changes saved successfully.
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Info className="h-3.5 w-3.5" /> Preference updates apply immediately across all notifications.
        </span>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-6 text-sm rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-semibold shadow-sm transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving Changes...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
