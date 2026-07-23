/* eslint-disable react-hooks/set-state-in-effect */
"use client";

// src/modules/client/notifications/hooks/useNotifications.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { Notification, NotificationPreference } from "../types";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../providers/NotificationsProvider";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);

  const [loading, setLoading] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [prefsError, setPrefsError] = useState("");

  // ─── Fetch notifications ──────────────────────────────────────────────

  const loadNotifications = useCallback(
    async (opts?: { unread_only?: boolean }) => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchNotifications(opts);
        setNotifications(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load notifications."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ─── Mark single read ─────────────────────────────────────────────────

  const markRead = useCallback(async (notificationId: number) => {
    // 1. Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      )
    );

    try {
      await markNotificationRead(notificationId);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to mark as read."
      );
    }
  }, []);

  // ─── Mark all read ────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    // 1. Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setSaving(true);
    setError("");

    try {
      await markAllNotificationsRead();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to mark all as read."
      );
    } finally {
      setSaving(false);
    }
  }, []);

  // ─── Fetch preferences ────────────────────────────────────────────────

  const loadPreferences = useCallback(async () => {
    setPrefsLoading(true);
    setPrefsError("");

    try {
      const data = await fetchNotificationPreferences();
      setPreferences(data);
    } catch (err: unknown) {
      setPrefsError(
        err instanceof Error
          ? err.message
          : "Failed to load notification preferences."
      );
    } finally {
      setPrefsLoading(false);
    }
  }, []);

  // ─── Update preferences ───────────────────────────────────────────────

  const savePreferences = useCallback(
    async (updated: Partial<NotificationPreference>[]) => {
      setSaving(true);
      setPrefsError("");

      try {
        await updateNotificationPreferences(updated);
        // Optimistically update local state
        setPreferences((prev) =>
          prev.map((pref) => {
            const match = updated.find((u) => u.category === pref.category);
            return match ? { ...pref, ...match } : pref;
          })
        );
        return true;
      } catch (err: unknown) {
        setPrefsError(
          err instanceof Error
            ? err.message
            : "Failed to save notification preferences."
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ─── Derived state ────────────────────────────────────────────────────

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const hasUnread = unreadCount > 0;

  return {
    notifications,
    preferences,

    loading,
    prefsLoading,
    saving,

    error,
    prefsError,

    unreadCount,
    hasUnread,

    loadNotifications,
    markRead,
    markAllRead,
    loadPreferences,
    savePreferences,

    clearError: () => setError(""),
    clearPrefsError: () => setPrefsError(""),
  };
}
