"use client";

// src/modules/client/notifications/components/ClientNotificationBell.tsx

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientNotificationDropdown } from "./ClientNotificationDropdown";
import { useNotifications } from "../hooks/useNotifications";
import { cn } from "@/lib/utils";

export function ClientNotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="icon"
        className="relative max-md:size-10"
        aria-label={
          unreadCount > 0 ? `Open notifications (${unreadCount} unread)` : "Open notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            unreadCount > 0 && "text-zinc-900 dark:text-zinc-100",
            open && "scale-110"
          )}
        />

        {/* Animated unread badge */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-1 top-1 flex h-4 min-w-4 origin-center items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs transition-all duration-300 ease-out",
            unreadCount > 0 ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        >
          {unreadCount > 0 && (
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-75 motion-reduce:animate-none" />
          )}
          <span
            key={unreadCount}
            className="relative z-10 inline-block origin-center animate-in zoom-in-50 fade-in duration-200"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </span>
      </Button>

      {open && (
        <>
          {/* Overlay to close the dropdown when clicking outside */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ClientNotificationDropdown
            notifications={notifications}
            isLoading={loading}
            unreadCount={unreadCount}
            onClose={() => setOpen(false)}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />
        </>
      )}
    </div>
  );
}