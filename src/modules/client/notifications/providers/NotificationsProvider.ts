// src/modules/client/notifications/providers/NotificationsProvider.ts

import { Notification, NotificationPreference } from "../types";

const BASE = "/api/client/notifications";

// ─── Fetch Notifications ───────────────────────────────────────────────────

export async function fetchNotifications(params?: {
  unread_only?: boolean;
  starred_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  const query = new URLSearchParams();
  if (params?.unread_only) query.set("unread_only", "true");
  if (params?.starred_only) query.set("starred_only", "true");
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const qs = query.toString();
  const res = await fetch(`${BASE}${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Failed to fetch notifications.");
  }

  return json.notifications ?? [];
}

// ─── Update Single Read/Unread Status ─────────────────────────────────────

export async function updateNotificationRead(
  notificationId: number,
  isRead: boolean = true
): Promise<void> {
  const res = await fetch(`${BASE}/${notificationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_read: isRead }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json.error ??
        (isRead
          ? "Failed to mark notification as read."
          : "Failed to mark notification as unread.")
    );
  }
}

export async function markNotificationRead(
  notificationId: number
): Promise<void> {
  return updateNotificationRead(notificationId, true);
}

export async function markNotificationUnread(
  notificationId: number
): Promise<void> {
  return updateNotificationRead(notificationId, false);
}

// ─── Update Single Starred Status ─────────────────────────────────────────

export async function updateNotificationStarred(
  notificationId: number,
  isStarred: boolean
): Promise<void> {
  const res = await fetch(`${BASE}/${notificationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_starred: isStarred }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json.error ??
        (isStarred
          ? "Failed to star notification."
          : "Failed to unstar notification.")
    );
  }
}

// ─── Delete Single Notification ───────────────────────────────────────────

export async function deleteSingleNotification(
  notificationId: number
): Promise<void> {
  const res = await fetch(`${BASE}/${notificationId}`, {
    method: "DELETE",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Failed to delete notification.");
  }
}

// ─── Bulk Update Notifications (Read / Unread) ────────────────────────────

export async function bulkUpdateNotifications(
  notificationIds: number[],
  isRead: boolean
): Promise<{ success: boolean; updated: number; unread_count?: number }> {
  const res = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notification_ids: notificationIds,
      is_read: isRead,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json.error ??
        (isRead
          ? "Failed to mark selected notifications as read."
          : "Failed to mark selected notifications as unread.")
    );
  }

  return json;
}

// ─── Bulk Update Notifications (Starred / Unstarred) ──────────────────────

export async function bulkUpdateNotificationsStarred(
  notificationIds: number[],
  isStarred: boolean
): Promise<{ success: boolean; updated: number; unread_count?: number }> {
  const res = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notification_ids: notificationIds,
      is_starred: isStarred,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json.error ??
        (isStarred
          ? "Failed to star selected notifications."
          : "Failed to unstar selected notifications.")
    );
  }

  return json;
}

// ─── Bulk Delete Notifications ────────────────────────────────────────────

export async function bulkDeleteNotifications(
  notificationIds: number[]
): Promise<{ success: boolean; deleted: number; unread_count?: number }> {
  const res = await fetch(BASE, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notification_ids: notificationIds,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Failed to delete selected notifications.");
  }

  return json;
}

// ─── Mark All as Read ─────────────────────────────────────────────────────

export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mark_all_read: true }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Failed to mark all notifications as read.");
  }
}

// ─── Fetch Preferences ────────────────────────────────────────────────────

export async function fetchNotificationPreferences(): Promise<
  NotificationPreference[]
> {
  const res = await fetch(`${BASE}/preferences`, {
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Failed to fetch notification preferences.");
  }

  return json.preferences ?? [];
}

// ─── Update Preferences ───────────────────────────────────────────────────

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreference>[]
): Promise<void> {
  const res = await fetch(`${BASE}/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Failed to update notification preferences.");
  }
}
