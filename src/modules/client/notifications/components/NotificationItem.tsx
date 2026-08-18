"use client";

// src/modules/client/notifications/components/NotificationItem.tsx

import React from "react";
import {
  Users,
  Calendar,
  CalendarClock,
  CalendarX,
  Briefcase,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  FileX,
  MessageSquare,
  Send,
  Sparkles,
  UserCheck,
  Zap,
} from "lucide-react";
import { Notification } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
}

function getNotificationVisualConfig(notification: Notification) {
  const category = (notification.category || "").toUpperCase();
  const eventType = (notification.event_type || "").toUpperCase();
  const title = (notification.title || "").toLowerCase();
  const message = (notification.message || "").toLowerCase();

  // Shortlisted / Hired
  if (
    category.includes("SHORTLIST") ||
    eventType.includes("SHORTLIST") ||
    title.includes("shortlist") ||
    message.includes("shortlist") ||
    title.includes("hired")
  ) {
    return {
      icon: UserCheck,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    };
  }

  // Application Withdrawn / Rejected
  if (
    category.includes("WITHDRAW") ||
    eventType.includes("WITHDRAW") ||
    category.includes("REJECT") ||
    eventType.includes("REJECT") ||
    title.includes("withdr") ||
    title.includes("reject")
  ) {
    return {
      icon: FileX,
      colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    };
  }

  // Application Received / Created
  if (
    category.includes("APPLICATION") ||
    eventType.includes("APPLICATION") ||
    title.includes("application") ||
    message.includes("application")
  ) {
    return {
      icon: FileText,
      colorClass: "bg-primary/10 text-primary border border-primary/20",
    };
  }

  // Interviews
  if (
    category.includes("INTERVIEW") ||
    eventType.includes("INTERVIEW") ||
    title.includes("interview")
  ) {
    if (category.includes("CANCEL") || title.includes("cancel")) {
      return {
        icon: CalendarX,
        colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
      };
    }
    if (category.includes("RESCHEDULE") || title.includes("resched")) {
      return {
        icon: CalendarClock,
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      };
    }
    return {
      icon: Calendar,
      colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    };
  }

  // Messages
  if (
    category.includes("MESSAGE") ||
    eventType.includes("MESSAGE") ||
    title.includes("message")
  ) {
    return {
      icon: MessageSquare,
      colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    };
  }

  // Invitations
  if (
    category.includes("INVITATION") ||
    eventType.includes("INVITATION") ||
    title.includes("invitation") ||
    title.includes("invite")
  ) {
    return {
      icon: Send,
      colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    };
  }

  // Job Approved / Posting
  if (
    category.includes("JOB_APPROVED") ||
    title.includes("job approved") ||
    title.includes("posting approved")
  ) {
    return {
      icon: CheckCircle2,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    };
  }

  if (category.includes("JOB") || title.includes("job")) {
    return {
      icon: Briefcase,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    };
  }

  // Team
  if (category.includes("TEAM") || title.includes("team")) {
    return {
      icon: Users,
      colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    };
  }

  // Product Updates / Marketing
  if (category.includes("PRODUCT") || category.includes("MARKETING")) {
    return {
      icon: category.includes("PRODUCT") ? Zap : Sparkles,
      colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
    };
  }

  // Default fallback
  return {
    icon: Bell,
    colorClass: "bg-muted text-muted-foreground border border-border",
  };
}

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
  const { icon: Icon, colorClass } = getNotificationVisualConfig(notification);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.notification_id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const handleQuickMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(notification.notification_id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "group relative flex items-center justify-between gap-4 px-5 py-4 cursor-pointer transition-all duration-150 select-none",
        "hover:bg-muted/40",
        !notification.is_read
          ? "bg-primary/[0.04] dark:bg-primary/[0.08] border-l-2 border-primary"
          : "bg-card"
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {/* Contextual Icon Badge */}
        <div
          className={cn(
            "flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5 shadow-2xs",
            colorClass
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-sm leading-snug line-clamp-1",
                notification.is_read
                  ? "font-normal text-muted-foreground"
                  : "font-semibold text-foreground"
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </div>

          <p
            className={cn(
              "text-xs mt-1 leading-relaxed line-clamp-2",
              notification.is_read
                ? "text-muted-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {notification.message}
          </p>
        </div>
      </div>

      {/* Right Actions & Meta */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(notification.created_at)}
        </span>

        {/* Quick action: Mark as Read button on hover for unread items */}
        {!notification.is_read && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleQuickMarkRead}
            title="Mark as read"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hidden sm:inline-flex"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}
