"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientNotificationDropdown } from "./ClientNotificationDropdown";
import { useNotifications } from "../hooks/useNotifications";
import { cn } from "@/lib/utils";

export function ClientNotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markRead } = useNotifications();

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className={cn("h-5 w-5 transition-transform duration-200", unreadCount > 0 && "text-zinc-900 dark:text-zinc-100")} />
        {/* Animated Unread Badge */}
        <span
          className={cn(
            "absolute top-1 right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs transition-all duration-300 ease-out origin-center pointer-events-none",
            unreadCount > 0
              ? "scale-100 opacity-100"
              : "scale-0 opacity-0"
          )}
        >
          {unreadCount > 0 && (
            <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75" />
          )}
          <span
            key={unreadCount}
            className="relative z-10 inline-block animate-in zoom-in-50 fade-in duration-200 origin-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </span>
      </Button>

      {open && (
        <>
          {/* Overlay to close dropdown when clicking outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <ClientNotificationDropdown
            notifications={notifications}
            isLoading={loading}
            onClose={() => setOpen(false)}
            onMarkRead={markRead}
          />
        </>
      )}
    </div>
  );
}
