// src/modules/school-admin/hooks/useSchoolAdminNotifications.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { FreelancerNotification } from "@/modules/freelancer/freelancer-notifications/types";

export function useSchoolAdminNotifications() {
  const [notifications, setNotifications] = useState<FreelancerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/school-admin/notifications?unread_only=false");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch school admin notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/school-admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        return true;
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
    return false;
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/school-admin/notifications", {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        return true;
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
    return false;
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
