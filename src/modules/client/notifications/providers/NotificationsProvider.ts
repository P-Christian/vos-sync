// src/modules/client/notifications/providers/NotificationsProvider.ts

import { Notification, NotificationPreference } from "../types";

const BASE = "/api/client/notifications";

// ─── Fetch Notifications ───────────────────────────────────────────────────

export async function fetchNotifications(params?: {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  const query = new URLSearchParams();
  if (params?.unread_only) query.set("unread_only", "true");
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

// ─── Mark Single as Read ──────────────────────────────────────────────────

export async function markNotificationRead(
  notificationId: number
): Promise<void> {
  const res = await fetch(`${BASE}/${notificationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_read: true }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Failed to mark notification as read.");
  }
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
