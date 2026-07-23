"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Notification } from "../types";

interface Props {
  notifications: Notification[];
  isLoading: boolean;
  onClose: () => void;
  onMarkRead: (id: number) => void;
}

export function ClientNotificationDropdown({
  notifications,
  isLoading,
  onClose,
  onMarkRead,
}: Props) {
  const router = useRouter();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      onMarkRead(notification.notification_id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }

    onClose();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-background shadow-lg z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
        <h3 className="font-semibold text-sm">Notifications</h3>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notif) => {
              const isUnread = !notif.is_read;
              return (
                <li
                  key={notif.notification_id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    isUnread ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-snug ${
                            isUnread
                              ? "font-semibold text-foreground"
                              : "font-medium text-muted-foreground"
                          }`}
                        >
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span className="flex h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p
                        className={`text-xs line-clamp-2 ${
                          isUnread
                            ? "text-muted-foreground"
                            : "text-muted-foreground/70"
                        }`}
                      >
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 pt-1">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
