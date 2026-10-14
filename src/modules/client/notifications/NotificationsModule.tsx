"use client";

// src/modules/client/notifications/NotificationsModule.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCheck,
  FileText,
  Layers,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "./hooks/useNotifications";
import { useRealtime } from "@/modules/shared/providers/RealtimeProvider";
import NotificationList from "./components/NotificationList";
import { cn } from "@/lib/utils";
import { CategoryFilter, matchesCategory } from "./utils/notificationVisuals";

// Notification preferences now live in Settings.
// Adjust this path to wherever the preferences section is mounted.
const SETTINGS_HREF = "/vos-sync/client/settings";

type ViewFilter = "all" | "unread";

interface CategoryOption {
  label: string;
  value: CategoryFilter;
  icon: React.ElementType;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { label: "All", value: "ALL", icon: Layers },
  { label: "Applications", value: "APPLICATIONS", icon: FileText },
  { label: "Interviews", value: "INTERVIEWS", icon: Calendar },
];

const PILL_SPRING = { type: "spring", stiffness: 500, damping: 36 } as const;

export default function NotificationsModule() {
  const router = useRouter();
  const {
    notifications,
    loading,
    saving,
    error,
    unreadCount,
    loadNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  const { subscribe } = useRealtime();

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [view, setView] = useState<ViewFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Live updates
  useEffect(() => {
    const unsubscribe = subscribe("vs_employer_notification", ({ data }) => {
      if (data && data.length > 0) {
        loadNotifications();
      }
    });
    return () => unsubscribe();
  }, [subscribe, loadNotifications]);

  const handleClearFilters = () => {
    setSelectedCategory("ALL");
    setView("all");
    setSearchQuery("");
  };

  // Category counts computed from the full list
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      ALL: notifications.length,
      APPLICATIONS: 0,
      INTERVIEWS: 0,
    };

    notifications.forEach((n) => {
      if (matchesCategory(n, "APPLICATIONS")) counts.APPLICATIONS += 1;
      if (matchesCategory(n, "INTERVIEWS")) counts.INTERVIEWS += 1;
    });

    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return notifications.filter((n) => {
      if (view === "unread" && n.is_read) return false;
      if (!matchesCategory(n, selectedCategory)) return false;

      if (q) {
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMessage = n.message?.toLowerCase().includes(q);
        if (!matchTitle && !matchMessage) return false;
      }

      return true;
    });
  }, [notifications, view, selectedCategory, searchQuery]);

  const isFiltered = selectedCategory !== "ALL" || view !== "all" || searchQuery.trim().length > 0;

  // Only show the skeleton on the first load, not on every realtime refresh
  const showSkeleton = loading && notifications.length === 0;

  return (
    // reducedMotion="user" turns off movement (but keeps fades) for people who prefer less motion
    <MotionConfig reducedMotion="user">
    <div className="space-y-4 md:space-y-6 client-page-transition">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .client-page-transition { animation: none; }
        }
      `}</style>

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}.`
              : "Stay updated on candidate activity, interviews, and team communications."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={markAllRead}
              disabled={saving}
              variant="outline"
              size="sm"
              aria-label="Mark all as read"
              className="h-9 max-md:size-10 max-md:px-0 cursor-pointer text-xs font-medium"
            >
              <CheckCheck className="h-4 w-4 md:mr-1.5 text-primary" />
              <span className="max-md:hidden">Mark all as read</span>
            </Button>
          )}
          <Button
            onClick={() => router.push(SETTINGS_HREF)}
            variant="ghost"
            size="sm"
            aria-label="Notification settings"
            className="h-9 max-md:size-10 max-md:px-0 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-4 w-4 md:mr-1.5" />
            <span className="max-md:hidden">Settings</span>
          </Button>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <Button
            onClick={() => loadNotifications()}
            variant="ghost"
            size="sm"
            className="h-8 max-md:min-h-10 shrink-0 cursor-pointer text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* ── Feed Card ─────────────────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden rounded-xl border bg-card !py-0 shadow-sm">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="space-y-3 border-b border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* All / Unread segmented control */}
              <div
                role="group"
                aria-label="Notification view"
                className="inline-flex w-full sm:w-auto rounded-lg bg-muted/60 p-0.5"
              >
                {(
                  [
                    { value: "all", label: "All", count: notifications.length },
                    { value: "unread", label: "Unread", count: unreadCount },
                  ] as const
                ).map((opt) => {
                  const active = view === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setView(opt.value)}
                      className={cn(
                        "relative flex flex-1 sm:flex-none items-center justify-center rounded-md px-3.5 py-1.5 max-md:min-h-10 text-xs font-medium transition-colors cursor-pointer",
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {/* Sliding highlight that follows the active tab */}
                      {active && (
                        <motion.span
                          layoutId="notifications-view-pill"
                          transition={PILL_SPRING}
                          className="absolute inset-0 rounded-md bg-background shadow-sm"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {opt.label}
                        <span
                          className={cn(
                            "min-w-5 rounded-full px-1.5 text-center text-xs md:text-[10px] font-bold transition-colors",
                            active && opt.value === "unread" && opt.count > 0
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {opt.count > 99 ? "99+" : opt.count}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by candidate, job, or keyword..."
                  aria-label="Search notifications"
                  className="h-9 rounded-lg border-border bg-background pl-9 pr-9 md:text-xs max-md:h-10 max-md:text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground max-md:size-10 max-md:right-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category chips */}
            <div className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
              {CATEGORY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const count = categoryCounts[opt.value];
                const isSelected = selectedCategory === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(opt.value)}
                    className={cn(
                      "relative flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1.5 max-md:min-h-10 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {/* Sliding highlight that follows the selected category */}
                    {isSelected && (
                      <motion.span
                        layoutId="notifications-category-pill"
                        transition={PILL_SPRING}
                        className="absolute inset-0 rounded-full bg-primary"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                      <span
                        className={cn(
                          "text-xs md:text-[10px] font-bold transition-colors",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground/70"
                        )}
                      >
                        {count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <NotificationList
            resetKey={`${view}-${selectedCategory}-${searchQuery.trim()}`}
            notifications={filteredNotifications}
            loading={showSkeleton}
            onMarkRead={markRead}
            isFiltered={isFiltered}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>
    </div>
    </MotionConfig>
  );
}