"use client";

// src/modules/shared/providers/RealtimeProvider.tsx

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { usePushNotifications } from "../hooks/usePushNotifications";

export type RealtimeEventType = "create" | "update" | "delete" | "init";

export interface RealtimeMessage {
  collection: string;
  event: RealtimeEventType;
  data: Record<string, unknown>[];
}

export type RealtimeCallback = (data: {
  collection: string;
  event: RealtimeEventType;
  data: Record<string, unknown>[];
}) => void;

export type RealtimeMode = "stream" | "polling";

interface RealtimeContextType {
  isConnected: boolean;
  mode: RealtimeMode;
  setMode: (mode: RealtimeMode) => void;
  subscribe: (collection: string, callback: RealtimeCallback) => () => void;
  sendCustom: (payload: Record<string, unknown>) => void;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  mode: "stream",
  setMode: () => {},
  subscribe: () => () => {},
  sendCustom: () => {},
  reconnect: () => {},
});

/**
 * Normalizes frontend subscription collection aliases to canonical Directus collection names.
 */
export function normalizeDirectusCollection(col: string): string {
  if (col === "vs_messages") return "vs_message";
  if (col === "vs_interview_schedule") return "vs_interview";
  return col;
}

/**
 * 🎛️ CODE-LEVEL REALTIME MODE TOGGLE
 * Defaults to HTTPS Server-Sent Events (SSE) stream relay with seamless fallback to polling.
 */
export const DEFAULT_REALTIME_MODE: RealtimeMode = "stream";

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Ensure Service Worker is registered automatically across the entire app
  usePushNotifications();

  const [mode, setModeState] = useState<RealtimeMode>(DEFAULT_REALTIME_MODE);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const subscribersRef = useRef<Map<string, Set<RealtimeCallback>>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setMode = useCallback((newMode: RealtimeMode) => {
    setModeState(newMode);
    console.log(`🔄 [Realtime] Switched mode to '${newMode.toUpperCase()}'`);
  }, []);

  const notifySubscribers = useCallback(
    (collection: string, event: RealtimeEventType, data: Record<string, unknown>[]) => {
      // Notify the target collection as well as any known aliases
      const targetCollections = new Set<string>([collection]);
      if (collection === "vs_message") targetCollections.add("vs_messages");
      if (collection === "vs_messages") targetCollections.add("vs_message");
      if (collection === "vs_interview") targetCollections.add("vs_interview_schedule");
      if (collection === "vs_interview_schedule") targetCollections.add("vs_interview");

      targetCollections.forEach((col) => {
        const subs = subscribersRef.current.get(col);
        if (subs) {
          subs.forEach((cb) => {
            try {
              cb({ collection: col, event, data });
            } catch (err) {
              console.error(`Error in realtime subscriber for ${col}:`, err);
            }
          });
        }
      });
    },
    []
  );

  const handleIncomingStreamPayload = useCallback(
    (payload: RealtimeMessage) => {
      const { collection, event: eventType, data: records } = payload;
      if (!collection || !records) return;

      console.log(`📡 [Realtime Stream] Event on '${collection}' [${eventType}]:`, records);

      // If a reaction was updated, notify vs_message subscribers to refresh reaction counts
      if (collection === "vs_message_reaction") {
        notifySubscribers("vs_message", eventType, records);
        notifySubscribers("vs_messages", eventType, records);
      } else {
        notifySubscribers(collection, eventType, records);
      }

      if (eventType === "create" && records.length > 0) {
        records.forEach((rec) => {
          if (
            collection === "vs_freelancer_notification" ||
            collection === "vs_employer_notification"
          ) {
            const title = String(rec.title || "New Notification");
            const message = String(rec.message || "");
            toast.info(title, { description: message });

            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              if (document.hidden) {
                new Notification(title, {
                  body: message,
                  icon: "/favicon.ico",
                });
              }
            }
          }

          if (collection === "vs_message" || collection === "vs_messages") {
            const senderName = String(rec.sender_name || "New Message");
            const messageText = String(
              rec.message_content || rec.message_text || "Sent you a message"
            );

            if (
              typeof window !== "undefined" &&
              !window.location.pathname.includes("/messaging")
            ) {
              toast(senderName, { description: messageText });
            }
          }

          if (collection === "vs_interview" || collection === "vs_interview_schedule") {
            const title = String(
              rec.title || rec.interview_title || "Interview Schedule Update"
            );
            toast.success(title, {
              description: "An interview schedule has been updated or created.",
            });
          }

          if (collection === "vs_job_application") {
            const status = String(rec.status || "");
            if (status) {
              toast.info(`Application Status: ${status}`, {
                description: "Your job application status was updated.",
              });
            }
          }
        });
      }
    },
    [notifySubscribers]
  );

  const connectStream = useCallback(() => {
    if (typeof window === "undefined") return;
    if (eventSourceRef.current) return;

    try {
      console.log("🔌 [Realtime Stream] Connecting to SSE relay at /api/realtime/stream...");
      const es = new EventSource("/api/realtime/stream", { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        console.log("🟢 [Realtime Stream] Connected successfully over HTTPS.");
      };

      es.addEventListener("connected", () => {
        setIsConnected(true);
      });

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeMessage;
          handleIncomingStreamPayload(payload);
        } catch (e) {
          console.error("❌ [Realtime Stream] Failed to parse message:", e);
        }
      };

      es.onerror = (err) => {
        console.warn("🟡 [Realtime Stream] SSE stream connection notice (auto-reconnecting):", err);
        // EventSource automatically retries connections
      };
    } catch (err) {
      console.error("💥 [Realtime Stream] Exception initializing EventSource:", err);
      setIsConnected(false);
    }
  }, [handleIncomingStreamPayload]);

  // Handle Mode Switching (Stream vs Polling)
  useEffect(() => {
    if (mode === "stream") {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      connectStream();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(true);

      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(() => {
        const activeCollections = Array.from(subscribersRef.current.keys());
        activeCollections.forEach((collection) => {
          notifySubscribers(collection, "update", []);
        });
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [mode, connectStream, notifySubscribers]);

  const subscribe = useCallback(
    (collection: string, callback: RealtimeCallback) => {
      if (!subscribersRef.current.has(collection)) {
        subscribersRef.current.set(collection, new Set());
      }
      const set = subscribersRef.current.get(collection)!;
      set.add(callback);

      return () => {
        set.delete(callback);
        if (set.size === 0) {
          subscribersRef.current.delete(collection);
        }
      };
    },
    []
  );

  const sendCustom = useCallback((payload: Record<string, unknown>) => {
    console.log("[Realtime Stream] sendCustom called:", payload);
  }, []);

  const reconnect = useCallback(() => {
    if (mode === "stream") {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      connectStream();
    }
  }, [mode, connectStream]);

  return (
    <RealtimeContext.Provider
      value={{ isConnected, mode, setMode, subscribe, sendCustom, reconnect }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime() {
  return useContext(RealtimeContext);
}
