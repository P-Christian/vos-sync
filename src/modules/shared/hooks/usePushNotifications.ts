"use client";

import { useEffect, useState, useCallback } from "react";

export function usePushNotifications() {
  const [isSupported] = useState<boolean>(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      return true;
    }
    return false;
  });

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  useEffect(() => {
    if (isSupported && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      // Register Service Worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("⚡ [Push] Service worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.warn("[Push] Service worker registration failed:", err);
        });
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied";

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      return res;
    } catch (err) {
      console.error("[Push] Error requesting notification permission:", err);
      return "denied";
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") return;

      try {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              ...options,
            });
          });
        } else {
          new Notification(title, {
            icon: "/favicon.ico",
            ...options,
          });
        }
      } catch (err) {
        console.error("[Push] Error sending local notification:", err);
      }
    },
    [isSupported, permission]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
}
