"use client";

// src/modules/client/notifications/hooks/useNotifications.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Notification, NotificationPreference } from "../types";
import {
  fetchNotifications,
  updateNotificationRead,
  updateNotificationStarred,
  markAllNotificationsRead,
  bulkUpdateNotifications,
  bulkUpdateNotificationsStarred,
  bulkDeleteNotifications,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../providers/NotificationsProvider";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);

  // Start loading as true to avoid synchronous setState inside mount effect
  const [loading, setLoading] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [prefsError, setPrefsError] = useState("");

  // Lets the retry action on a failed-load toast call the latest loader.
  const reloadRef = useRef<() => void>(() => {});

  // ─── Fetch notifications ──────────────────────────────────────────────

  const loadNotifications = useCallback(
    async (opts?: { unread_only?: boolean; starred_only?: boolean; quiet?: boolean }) => {
      if (!opts?.quiet) {
        setLoading(true);
      }

      try {
        const data = await fetchNotifications(opts);
        setNotifications(data);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load notifications.",
          { action: { label: "Retry", onClick: () => reloadRef.current() } }
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    reloadRef.current = () => {
      void loadNotifications();
    };
  }, [loadNotifications]);

  // Initial load on mount without synchronous setState in effect
  useEffect(() => {
    let isMounted = true;
    void fetchNotifications().then(
      (data) => {
        if (isMounted) {
          setNotifications(data);
          setLoading(false);
        }
      },
      (err: unknown) => {
        if (isMounted) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load notifications.",
            { action: { label: "Retry", onClick: () => reloadRef.current() } }
          );
          setLoading(false);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Toggle / Mark single notification read status ────────────────────

  const toggleReadStatus = useCallback(
    async (notificationId: number, currentReadStatus: boolean) => {
      const nextRead = !currentReadStatus;

      // 1. Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: nextRead } : n
        )
      );

      try {
        await updateNotificationRead(notificationId, nextRead);
        toast.success(nextRead ? "Marked as read" : "Marked as unread");
      } catch (err: unknown) {
        // Rollback
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId
              ? { ...n, is_read: currentReadStatus }
              : n
          )
        );
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to mark notification as ${nextRead ? "read" : "unread"}.`
        );
      }
    },
    []
  );

  const markRead = useCallback(
    async (notificationId: number) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );

      try {
        await updateNotificationRead(notificationId, true);
      } catch (err: unknown) {
        // Rollback
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId ? { ...n, is_read: false } : n
          )
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to mark as read."
        );
      }
    },
    []
  );

  const markUnread = useCallback(
    async (notificationId: number) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: false } : n
        )
      );

      try {
        await updateNotificationRead(notificationId, false);
        toast.success("Marked as unread");
      } catch (err: unknown) {
        // Rollback
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId ? { ...n, is_read: true } : n
          )
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to mark as unread."
        );
      }
    },
    []
  );

  // ─── Toggle Starred Status ────────────────────────────────────────────

  const toggleStarredStatus = useCallback(
    async (notificationId: number, currentStarredStatus: boolean) => {
      const nextStarred = !currentStarredStatus;

      // 1. Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId
            ? { ...n, is_starred: nextStarred }
            : n
        )
      );

      try {
        await updateNotificationStarred(notificationId, nextStarred);
        toast.success(
          nextStarred ? "Notification starred" : "Notification unstarred"
        );
      } catch (err: unknown) {
        // Rollback
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId
              ? { ...n, is_starred: currentStarredStatus }
              : n
          )
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to update star status."
        );
      }
    },
    []
  );

  // ─── Bulk status update (Read / Unread) ────────────────────────────────

  const bulkSetRead = useCallback(
    async (notificationIds: number[], isRead: boolean) => {
      if (notificationIds.length === 0) return;

      const idSet = new Set(notificationIds);
      let previousNotifications: Notification[] = [];

      // 1. Optimistic update
      setNotifications((prev) => {
        previousNotifications = prev;
        return prev.map((n) =>
          idSet.has(n.notification_id) ? { ...n, is_read: isRead } : n
        );
      });

      try {
        await bulkUpdateNotifications(notificationIds, isRead);
        toast.success(
          `Marked ${notificationIds.length} ${
            notificationIds.length === 1 ? "notification" : "notifications"
          } as ${isRead ? "read" : "unread"}`
        );
      } catch (err: unknown) {
        // Rollback
        setNotifications(previousNotifications);
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to mark notifications as ${isRead ? "read" : "unread"}.`
        );
      }
    },
    []
  );

  // ─── Bulk Starred Update ──────────────────────────────────────────────

  const bulkSetStarred = useCallback(
    async (notificationIds: number[], isStarred: boolean) => {
      if (notificationIds.length === 0) return;

      const idSet = new Set(notificationIds);
      let previousNotifications: Notification[] = [];

      // 1. Optimistic update
      setNotifications((prev) => {
        previousNotifications = prev;
        return prev.map((n) =>
          idSet.has(n.notification_id) ? { ...n, is_starred: isStarred } : n
        );
      });

      try {
        await bulkUpdateNotificationsStarred(notificationIds, isStarred);
        toast.success(
          `${isStarred ? "Starred" : "Unstarred"} ${notificationIds.length} ${
            notificationIds.length === 1 ? "notification" : "notifications"
          }`
        );
      } catch (err: unknown) {
        // Rollback
        setNotifications(previousNotifications);
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isStarred ? "star" : "unstar"} notifications.`
        );
      }
    },
    []
  );

  // ─── Bulk delete ──────────────────────────────────────────────────────

  const bulkDelete = useCallback(
    async (notificationIds: number[]) => {
      if (notificationIds.length === 0) return;

      const idSet = new Set(notificationIds);
      let previousNotifications: Notification[] = [];

      // 1. Optimistic update
      setNotifications((prev) => {
        previousNotifications = prev;
        return prev.filter((n) => !idSet.has(n.notification_id));
      });

      try {
        await bulkDeleteNotifications(notificationIds);
        toast.success(
          `Deleted ${notificationIds.length} ${
            notificationIds.length === 1 ? "notification" : "notifications"
          }`
        );
      } catch (err: unknown) {
        // Rollback
        setNotifications(previousNotifications);
        toast.error(
          err instanceof Error ? err.message : "Failed to delete notifications."
        );
      }
    },
    []
  );

  // ─── Mark all read ────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setSaving(true);

    try {
      await markAllNotificationsRead();
      toast.success("All notifications marked as read");
    } catch (err: unknown) {
      setNotifications(previous);
      toast.error(
        err instanceof Error ? err.message : "Failed to mark all as read."
      );
    } finally {
      setSaving(false);
    }
  }, [notifications]);

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

  const starredCount = useMemo(
    () => notifications.filter((n) => n.is_starred).length,
    [notifications]
  );

  const hasUnread = unreadCount > 0;

  return {
    notifications,
    preferences,

    loading,
    prefsLoading,
    saving,

    prefsError,

    unreadCount,
    starredCount,
    hasUnread,

    loadNotifications,
    toggleReadStatus,
    toggleStarredStatus,
    markRead,
    markUnread,
    bulkSetRead,
    bulkSetStarred,
    bulkDelete,
    markAllRead,
    loadPreferences,
    savePreferences,

    clearPrefsError: () => setPrefsError(""),
  };
}
