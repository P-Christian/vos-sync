"use client";

// src/modules/freelancer/freelancer-notifications/components/FreelancerNotificationItem.tsx

import React from "react";
import {
  Briefcase,
  Calendar,
  MessageSquare,
  Bell,
  Share2,
  User,
  Zap,
  ExternalLink,
  Star,
} from "lucide-react";
import { FreelancerNotification } from "../types";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: FreelancerNotification;
  onMarkRead: (id: number) => void;
  onToggleStar: (id: number, currentStarred: boolean) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Briefcase: <Briefcase className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  MessageSquare: <MessageSquare className="h-4 w-4" />,
  Bell: <Bell className="h-4 w-4" />,
  Share2: <Share2 className="h-4 w-4" />,
  User: <User className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Application Updates": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "INTERVIEW": "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  "Referral Updates": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  "Profile Activity": "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
  "MESSAGE_RECEIVED": "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  "UNREAD_MESSAGE_REMINDER": "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  "PRODUCT_UPDATES": "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  "MARKETING_UPDATES": "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  "SYSTEM": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const CATEGORY_ICONS: Record<string, string> = {
  "Application Updates": "Briefcase",
  "INTERVIEW": "Calendar",
  "Referral Updates": "Share2",
  "Profile Activity": "User",
  "MESSAGE_RECEIVED": "MessageSquare",
  "UNREAD_MESSAGE_REMINDER": "MessageSquare",
  "PRODUCT_UPDATES": "Zap",
  "MARKETING_UPDATES": "Bell",
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

export default function FreelancerNotificationItem({
  notification,
  onMarkRead,
  onToggleStar,
}: NotificationItemProps) {
  const isStarred = Boolean(notification.is_starred);
  const isRead = Boolean(notification.is_read);

  const iconKey = CATEGORY_ICONS[notification.category] ?? "Bell";
  const icon = ICON_MAP[iconKey] ?? ICON_MAP.Bell;
  const colorClass = CATEGORY_COLORS[notification.category] ?? CATEGORY_COLORS.SYSTEM;

  const handleClick = () => {
    if (!isRead) {
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
        !isRead && "bg-emerald-50/30 dark:bg-emerald-950/10 border-l-2 border-emerald-500"
      )}
    >
      {/* Unread dot */}
      {!isRead && (
        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
              isRead
                ? "font-normal text-zinc-600 dark:text-zinc-400"
                : "font-semibold text-zinc-900 dark:text-zinc-50"
            )}
          >
            {notification.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-zinc-400 whitespace-nowrap">
              {formatRelativeTime(notification.created_at)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(notification.notification_id, isStarred);
              }}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-amber-500 transition-colors"
              title={isStarred ? "Remove star" : "Star notification"}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  isStarred ? "fill-amber-400 text-amber-400" : "text-zinc-400 hover:text-amber-400"
                )}
              />
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        {notification.action_url && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline">
            {notification.category === "Profile Activity" ? "View company profile" : "View details"}
            <ExternalLink className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    </div>
  );
}
