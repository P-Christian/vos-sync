"use client";

// src/modules/client/notifications/components/NotificationList.tsx

import React from "react";
import { Bell } from "lucide-react";
import { Notification } from "../types";
import NotificationItem from "./NotificationItem";

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: number) => void;
}

export default function NotificationList({
  notifications,
  loading,
  onMarkRead,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="text-sm text-zinc-400 animate-pulse">
          Loading notifications...
        </span>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
        <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Bell className="h-6 w-6 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            You&apos;re all caught up
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            No notifications to show right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.notification_id}
          notification={notification}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  );
}
