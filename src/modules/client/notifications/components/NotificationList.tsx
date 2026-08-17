"use client";

// src/modules/client/notifications/components/NotificationList.tsx

import React, { useMemo } from "react";
import { Bell, SearchX } from "lucide-react";
import { Notification } from "../types";
import NotificationItem from "./NotificationItem";
import { Button } from "@/components/ui/button";

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: number) => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

type DateGroupKey = "Today" | "Yesterday" | "This Week" | "Earlier";

interface DateGroup {
  key: DateGroupKey;
  label: string;
  items: Notification[];
}

function getDateGroupKey(dateStr: string): DateGroupKey {
  const date = new Date(dateStr);
  const now = new Date();

  // Compare calendar days
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  return "Earlier";
}

export default function NotificationList({
  notifications,
  loading,
  onMarkRead,
  isFiltered = false,
  onClearFilters,
}: NotificationListProps) {
  const groupedNotifications = useMemo<DateGroup[]>(() => {
    const groups: Record<DateGroupKey, Notification[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Earlier: [],
    };

    notifications.forEach((notif) => {
      const groupKey = getDateGroupKey(notif.created_at);
      groups[groupKey].push(notif);
    });

    const orderedKeys: DateGroupKey[] = ["Today", "Yesterday", "This Week", "Earlier"];

    return orderedKeys
      .map((key) => ({
        key,
        label: key,
        items: groups[key],
      }))
      .filter((group) => group.items.length > 0);
  }, [notifications]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground animate-pulse">
          Loading notifications...
        </span>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          {isFiltered ? (
            <SearchX className="h-6 w-6 text-muted-foreground" />
          ) : (
            <Bell className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-sm font-semibold text-foreground">
            {isFiltered ? "No notifications match your filters" : "You're all caught up"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isFiltered
              ? "Try adjusting your search query, category, or unread toggle."
              : "No notifications to show right now."}
          </p>
        </div>

        {isFiltered && onClearFilters && (
          <Button
            onClick={onClearFilters}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium cursor-pointer"
          >
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {groupedNotifications.map((group) => (
        <div key={group.key} className="space-y-0">
          <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-y border-border/40 select-none">
            {group.label}
          </div>
          <div className="divide-y divide-border/40">
            {group.items.map((notification) => (
              <NotificationItem
                key={notification.notification_id}
                notification={notification}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
