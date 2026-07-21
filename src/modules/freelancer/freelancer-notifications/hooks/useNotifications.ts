"use client";

import { useState, useEffect, useCallback } from "react";
import { FreelancerNotification } from "../types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<FreelancerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/freelancer/notifications");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch notifications");
      }
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const res = await fetch(`/api/freelancer/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error marking notification as read", err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
  };
}
