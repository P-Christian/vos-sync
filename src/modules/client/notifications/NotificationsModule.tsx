"use client";

// src/modules/client/notifications/NotificationsModule.tsx

import React, { useEffect, useState } from "react";
import {
  Bell,
  Settings2,
  CheckCheck,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications } from "./hooks/useNotifications";
import NotificationList from "./components/NotificationList";
import NotificationPreferences from "./components/NotificationPreferences";
import { cn } from "@/lib/utils";

type Tab = "feed" | "preferences";

const FILTER_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];

export default function NotificationsModule() {
  const {
    notifications,
    preferences,
    loading,
    prefsLoading,
    saving,
    error,
    prefsError,
    unreadCount,
    loadNotifications,
    markRead,
    markAllRead,
    loadPreferences,
    savePreferences,
    clearError,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [filter, setFilter] = useState<FilterValue>("ALL");

  // Load on mount
  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [loadNotifications, loadPreferences]);

  const handleTabChange = (tab: Tab) => {
    clearError();
    setActiveTab(tab);
  };

  const filteredNotifications =
    filter === "UNREAD"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="space-y-6 client-page-transition">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-indigo-950 via-zinc-900 to-neutral-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20 relative">
            <Bell className="h-7 w-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-zinc-300 mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "You're all caught up"}
            </p>
          </div>
        </div>

        {/* Mark all read — only on feed tab with unread items */}
        {activeTab === "feed" && unreadCount > 0 && (
          <Button
            onClick={markAllRead}
            disabled={saving}
            variant="outline"
            className="relative z-10 h-9 px-4 text-xs font-semibold border-white/20 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur transition-all"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Tabs + Content ────────────────────────────────────────────── */}
      <Card className="shadow-sm border bg-card rounded-xl py-0 gap-0 overflow-hidden">
        {/* Tab Bar */}
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-0 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleTabChange("feed")}
              className={cn(
                "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === "feed"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange("preferences")}
              className={cn(
                "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === "preferences"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Settings2 className="h-4 w-4" />
              Preferences
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* ── Feed Tab ──────────────────────────────────────── */}
          {activeTab === "feed" && (
            <>
              {/* Filter bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                      filter === opt.value
                        ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {opt.label}
                    {opt.value === "UNREAD" && unreadCount > 0 && (
                      <span className="ml-1.5 text-[10px]">({unreadCount})</span>
                    )}
                  </button>
                ))}
              </div>

              <NotificationList
                notifications={filteredNotifications}
                loading={loading}
                onMarkRead={markRead}
              />
            </>
          )}

          {/* ── Preferences Tab ───────────────────────────────── */}
          {activeTab === "preferences" && (
            <div className="p-6">
              <div className="mb-4">
                <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Notification Preferences
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-1">
                  Choose how you want to be notified for each category.
                </p>
              </div>

              <NotificationPreferences
                preferences={preferences}
                loading={prefsLoading}
                saving={saving}
                error={prefsError}
                onSave={savePreferences}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
