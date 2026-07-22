"use client";

// src/modules/client/notifications/components/NotificationItem.tsx

import React from "react";
import {
  Users,
  Calendar,
  Briefcase,
  Bell,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Notification, NOTIFICATION_CATEGORY_ICONS } from "../types";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Users: <Users className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  Briefcase: <Briefcase className="h-4 w-4" />,
  Bell: <Bell className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  JOB_APPLICATION: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  INTERVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  JOB_POSTING: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  SYSTEM: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  COMPANY: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export default function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const iconKey =
    NOTIFICATION_CATEGORY_ICONS[notification.category] ?? "Bell";
  const icon = ICON_MAP[iconKey] ?? ICON_MAP.Bell;
  const colorClass =
    CATEGORY_COLORS[notification.category] ?? CATEGORY_COLORS.SYSTEM;

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.notification_id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "group relative flex items-start gap-4 px-5 py-4 cursor-pointer transition-all duration-150",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        !notification.is_read &&
          "bg-indigo-50/50 dark:bg-indigo-950/20 border-l-2 border-indigo-500"
      )}
    >
      {/* Unread dot */}
      {!notification.is_read && (
        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5",
          colorClass
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              notification.is_read
                ? "font-normal text-zinc-600 dark:text-zinc-400"
                : "font-semibold text-zinc-900 dark:text-zinc-50"
            )}
          >
            {notification.title}
          </p>
          <span className="flex-shrink-0 text-[11px] text-zinc-400 mt-0.5 whitespace-nowrap">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        {notification.action_url && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
            View details
            <ExternalLink className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    </div>
  );
}
