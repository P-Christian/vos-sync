"use client";

// src/modules/client/notifications/NotificationsModule.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Layers,
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

// Notification preferences live in the Settings page — open that tab directly.
const SETTINGS_HREF = "/vos-sync/client/settings?tab=notifications";

type FilterTab = "ALL" | "UNREAD";

interface FilterTabOption {
  label: string;
  value: FilterTab;
  icon: React.ElementType;
}

const FILTER_TABS: FilterTabOption[] = [
  { label: "All", value: "ALL", icon: Layers },
  { label: "Unread", value: "UNREAD", icon: Bell },
];

const PILL_SPRING = { type: "spring", stiffness: 500, damping: 36 } as const;

export default function NotificationsModule() {
  const router = useRouter();
  const {
    notifications,
    loading,
    saving,
    unreadCount,
    loadNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  const { subscribe } = useRealtime();

  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
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
    setActiveTab("ALL");
    setSearchQuery("");
  };

  const tabCounts: Record<FilterTab, number> = {
    ALL: notifications.length,
    UNREAD: unreadCount,
  };

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return notifications.filter((n) => {
      if (activeTab === "UNREAD" && n.is_read) return false;

      if (q) {
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMessage = n.message?.toLowerCase().includes(q);
        if (!matchTitle && !matchMessage) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const isFiltered = activeTab !== "ALL" || searchQuery.trim().length > 0;

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

      {/* ── Feed Card ─────────────────────────────────────────────────── */}
      <Card className="gap-0 overflow-hidden rounded-xl border bg-card !py-0 shadow-sm">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Single filter tab bar */}
            <div
              role="group"
              aria-label="Filter notifications"
              className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5"
            >
              {FILTER_TABS.map((opt) => {
                const Icon = opt.icon;
                const count = tabCounts[opt.value];
                const isSelected = activeTab === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setActiveTab(opt.value)}
                    className={cn(
                      "relative flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1.5 max-md:min-h-10 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {/* Sliding highlight that follows the selected tab */}
                    {isSelected && (
                      <motion.span
                        layoutId="notifications-filter-pill"
                        transition={PILL_SPRING}
                        className="absolute inset-0 rounded-full bg-primary"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                      <span
                        className={cn(
                          "min-w-4 text-center text-xs md:text-[10px] font-bold transition-colors",
                          isSelected
                            ? "text-primary-foreground/80"
                            : count === 0
                              ? "text-muted-foreground/40"
                              : "text-muted-foreground/70"
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full shrink-0 lg:w-72">
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

          <NotificationList
            resetKey={`${activeTab}-${searchQuery.trim()}`}
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