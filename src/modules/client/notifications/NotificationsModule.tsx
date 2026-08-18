"use client";

// src/modules/client/notifications/NotificationsModule.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Settings2,
  CheckCheck,
  AlertCircle,
  Search,
  X,
  FileText,
  Calendar,
  MessageSquare,
  Users,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "./hooks/useNotifications";
import { useRealtime } from "@/modules/shared/providers/RealtimeProvider";
import NotificationList from "./components/NotificationList";
import NotificationPreferences from "./components/NotificationPreferences";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Notification } from "./types";

type Tab = "feed" | "preferences";

type CategoryFilter = "ALL" | "APPLICATIONS" | "INTERVIEWS" | "MESSAGES" | "TEAM_ACTIVITY";

interface CategoryOption {
  label: string;
  value: CategoryFilter;
  icon: React.ElementType;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { label: "All", value: "ALL", icon: Layers },
  { label: "Applications", value: "APPLICATIONS", icon: FileText },
  { label: "Interviews", value: "INTERVIEWS", icon: Calendar },
  { label: "Messages", value: "MESSAGES", icon: MessageSquare },
  { label: "Team Activity", value: "TEAM_ACTIVITY", icon: Users },
];

function matchesCategory(notification: Notification, category: CategoryFilter): boolean {
  if (category === "ALL") return true;
  const cat = (notification.category || "").toUpperCase();
  const eventType = (notification.event_type || "").toUpperCase();

  if (category === "APPLICATIONS") {
    return cat.includes("APPLICATION") || eventType.includes("APPLICATION");
  }
  if (category === "INTERVIEWS") {
    return cat.includes("INTERVIEW") || eventType.includes("INTERVIEW");
  }
  if (category === "MESSAGES") {
    return cat.includes("MESSAGE") || eventType.includes("MESSAGE");
  }
  if (category === "TEAM_ACTIVITY") {
    return cat.includes("TEAM") || eventType.includes("TEAM");
  }
  return true;
}

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

  const { subscribe } = useRealtime();

  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load on mount
  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [loadNotifications, loadPreferences]);

  useEffect(() => {
    const unsubscribe = subscribe("vs_employer_notification", ({ data }) => {
      if (data && data.length > 0) {
        loadNotifications();
      }
    });
    return () => unsubscribe();
  }, [subscribe, loadNotifications]);

  const handleTabChange = (tab: Tab) => {
    clearError();
    setActiveTab(tab);
  };

  const handleClearFilters = () => {
    setSelectedCategory("ALL");
    setUnreadOnly(false);
    setSearchQuery("");
  };

  // Category counts computed from the base notifications list
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      ALL: notifications.length,
      APPLICATIONS: 0,
      INTERVIEWS: 0,
      MESSAGES: 0,
      TEAM_ACTIVITY: 0,
    };

    notifications.forEach((n) => {
      if (matchesCategory(n, "APPLICATIONS")) counts.APPLICATIONS += 1;
      if (matchesCategory(n, "INTERVIEWS")) counts.INTERVIEWS += 1;
      if (matchesCategory(n, "MESSAGES")) counts.MESSAGES += 1;
      if (matchesCategory(n, "TEAM_ACTIVITY")) counts.TEAM_ACTIVITY += 1;
    });

    return counts;
  }, [notifications]);

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Unread filter
      if (unreadOnly && n.is_read) return false;

      // 2. Category filter
      if (!matchesCategory(n, selectedCategory)) return false;

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMessage = n.message?.toLowerCase().includes(q);
        if (!matchTitle && !matchMessage) return false;
      }

      return true;
    });
  }, [notifications, unreadOnly, selectedCategory, searchQuery]);

  const isFiltered = selectedCategory !== "ALL" || unreadOnly || searchQuery.trim().length > 0;

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

      {/* ── Page Header (Minimalist & Functional) ────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Stay updated on candidate activity, interviews, and team communications.
        </p>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Tabs + Content Card ────────────────────────────────────────── */}
      <Card className="shadow-sm border bg-card rounded-xl !py-0 gap-0 overflow-hidden">
        {/* Tab Bar */}
        <CardHeader className="border-b border-border px-6 !py-0 bg-muted/20">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleTabChange("feed")}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors cursor-pointer",
                activeTab === "feed"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {activeTab === "feed" && (
                <motion.div
                  layoutId="activeTabUnderlineNotifications"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>

            <button
              onClick={() => handleTabChange("preferences")}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors cursor-pointer",
                activeTab === "preferences"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings2 className="h-4 w-4" />
              Preferences
              {activeTab === "preferences" && (
                <motion.div
                  layoutId="activeTabUnderlineNotifications"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* ── Feed Tab ──────────────────────────────────────── */}
          {activeTab === "feed" && (
            <>
              {/* Comprehensive Filter Toolbar */}
              <div className="p-4 space-y-3 border-b border-border bg-card">
                {/* Search Bar + Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search alerts by candidate, job, or keyword..."
                      className="pl-9 pr-8 h-9 text-xs rounded-lg bg-background border-border"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Right Action Controls: Unread Only & Mark All Read */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setUnreadOnly((prev) => !prev)}
                      className={cn(
                        "h-9 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5",
                        unreadOnly
                          ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          unreadOnly ? "bg-primary" : "bg-muted-foreground/50"
                        )}
                      />
                      Unread only
                      {unreadCount > 0 && (
                        <span className="ml-0.5 text-[10px] opacity-80 font-bold">
                          ({unreadCount})
                        </span>
                      )}
                    </button>

                    {unreadCount > 0 && (
                      <Button
                        onClick={markAllRead}
                        disabled={saving}
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        Mark All Read
                      </Button>
                    )}
                  </div>
                </div>

                {/* Category Pills Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 scrollbar-none">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const count = categoryCounts[opt.value];
                    const isSelected = selectedCategory === opt.value;

                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedCategory(opt.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                        <span
                          className={cn(
                            "ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full",
                            isSelected
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <NotificationList
                notifications={filteredNotifications}
                loading={loading}
                onMarkRead={markRead}
                isFiltered={isFiltered}
                onClearFilters={handleClearFilters}
              />
            </>
          )}

          {/* ── Preferences Tab ───────────────────────────────── */}
          {activeTab === "preferences" && (
            <div className="p-6">
              <div className="mb-4">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Notification Preferences
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
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
