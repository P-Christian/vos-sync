"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { usePushNotifications } from "../hooks/usePushNotifications";

export type RealtimeEventType = "create" | "update" | "delete" | "init";

export interface RealtimeMessage {
  type: string;
  event?: RealtimeEventType;
  collection?: string;
  data?: unknown[];
  uid?: string;
  status?: string;
}

export type RealtimeCallback = (data: {
  collection: string;
  event: RealtimeEventType;
  data: Record<string, unknown>[];
}) => void;

export type RealtimeMode = "websocket" | "polling";

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
  mode: "polling",
  setMode: () => {},
  subscribe: () => () => {},
  sendCustom: () => {},
  reconnect: () => {},
});

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function getWebSocketUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8055";
  const normalized = base.replace(/\/$/, "");
  const wsProto = normalized.startsWith("https") ? "wss://" : "ws://";
  const hostPath = normalized.replace(/^https?:\/\//, "");
  return `${wsProto}${hostPath}/websocket`;
}

/**
 * 🎛️ CODE-LEVEL REALTIME MODE TOGGLE
 * Set to "polling" or "websocket" directly in code here.
 */
export const DEFAULT_REALTIME_MODE: RealtimeMode = "polling";

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Ensure Service Worker is registered automatically across the entire app
  usePushNotifications();

  const [mode, setModeState] = useState<RealtimeMode>(DEFAULT_REALTIME_MODE);

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<RealtimeCallback>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const setMode = useCallback((newMode: RealtimeMode) => {
    setModeState(newMode);
    console.log(`🔄 [Realtime] Switched mode to '${newMode.toUpperCase()}'`);
  }, []);

  const notifySubscribers = useCallback((collection: string, event: RealtimeEventType, data: Record<string, unknown>[]) => {
    const subs = subscribersRef.current.get(collection);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb({ collection, event, data });
        } catch (err) {
          console.error(`Error in realtime subscriber for ${collection}:`, err);
        }
      });
    }
  }, []);

  const handleIncomingMessage = useCallback(
    (msg: RealtimeMessage) => {
      console.log("📩 [Realtime WS] Received Message:", msg);

      if (msg.type === "auth" && msg.status === "ok") {
        console.log("✅ [Realtime WS] Directus WebSocket Authenticated successfully.");
      }

      if (msg.type === "subscription" && msg.event && msg.data) {
        const collection = msg.collection || (msg.uid ? msg.uid.replace("sub_", "") : "");
        const records = Array.isArray(msg.data) ? (msg.data as Record<string, unknown>[]) : [];

        console.log(`📡 [Realtime WS] Data Event on '${collection}' [${msg.event}]:`, records);

        if (collection && records.length > 0) {
          notifySubscribers(collection, msg.event, records);

          if (msg.event === "create") {
            records.forEach((rec) => {
              if (collection === "vs_freelancer_notification" || collection === "vs_employer_notification") {
                const title = String(rec.title || "New Notification");
                const message = String(rec.message || "");
                toast.info(title, { description: message });

                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                  if (document.hidden) {
                    new Notification(title, {
                      body: message,
                      icon: "/favicon.ico",
                    });
                  }
                }
              }

              if (collection === "vs_messages") {
                const senderName = String(rec.sender_name || "New Message");
                const messageText = String(rec.message_text || "Sent you a message");
                
                if (typeof window !== "undefined" && !window.location.pathname.includes("/messaging")) {
                  toast(senderName, { description: messageText });
                }
              }

              if (collection === "vs_interview_schedule") {
                const title = String(rec.title || rec.interview_title || "Interview Schedule Update");
                toast.success(title, { description: "An interview schedule has been updated or created." });
              }

              if (collection === "vs_job_application") {
                const status = String(rec.status || "");
                if (status) {
                  toast.info(`Application Status: ${status}`, { description: "Your job application status was updated." });
                }
              }
            });
          }
        }
      }
    },
    [notifySubscribers]
  );

  const connectRef = useRef<() => void>(() => {});

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      console.log("🔌 [Realtime WS] Attempting connection to:", url);
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        retryCountRef.current = 0;
        console.log("🟢 [Realtime WS] WebSocket OPENED successfully at:", url);

        const token = getCookie("vos_access_token");
        if (token) {
          console.log("🔑 [Realtime WS] Sending Directus Auth token frame...");
          ws.send(JSON.stringify({ type: "auth", access_token: token }));
        }

        const collectionsToSubscribe = Array.from(subscribersRef.current.keys());
        collectionsToSubscribe.forEach((collection) => {
          console.log(`📡 [Realtime WS] Subscribing to '${collection}'...`);
          ws.send(
            JSON.stringify({
              type: "subscribe",
              collection,
              query: { fields: ["*"] },
              uid: `sub_${collection}`,
            })
          );
        });
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeMessage;
          handleIncomingMessage(parsed);
        } catch (e) {
          console.error("❌ [Realtime WS] Failed to parse message:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("🔴 [Realtime WS] WebSocket ERROR encountered. WebSockets may be disabled on Directus backend.", err);
      };

      ws.onclose = (evt) => {
        setIsConnected(false);
        socketRef.current = null;
        console.warn(`🟡 [Realtime WS] WebSocket CLOSED. Code: ${evt.code}`);

        if (retryCountRef.current < 5 && mode === "websocket") {
          retryCountRef.current += 1;
          const delay = Math.min(30000, 5000 * Math.pow(1.5, retryCountRef.current));
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, delay);
        }
      };
    } catch (err) {
      console.error("💥 [Realtime WS] Exception initializing WebSocket:", err);
      setIsConnected(false);
    }
  }, [handleIncomingMessage, mode]);

  useEffect(() => {
    connectRef.current = connectWebSocket;
  }, [connectWebSocket]);

  // Handle Mode Switching (WebSocket vs Polling)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === "websocket") {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      console.log("⚡ [Realtime] Running in WEBSOCKET mode.");
      timer = setTimeout(() => {
        connectWebSocket();
      }, 0);
    } else {
      if (socketRef.current) {
        console.log("⚡ [Realtime] Closing WebSocket connection for POLLING mode.");
        socketRef.current.close();
        socketRef.current = null;
      }
      timer = setTimeout(() => {
        setIsConnected(true);
      }, 0);
      console.log("⚡ [Realtime] Running in HTTP POLLING mode (3s interval).");

      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(() => {
        const activeCollections = Array.from(subscribersRef.current.keys());
        activeCollections.forEach((collection) => {
          notifySubscribers(collection, "update", []);
        });
      }, 3000);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [mode, connectWebSocket, notifySubscribers]);

  const subscribe = useCallback((collection: string, callback: RealtimeCallback) => {
    if (!subscribersRef.current.has(collection)) {
      subscribersRef.current.set(collection, new Set());
    }
    const set = subscribersRef.current.get(collection)!;
    set.add(callback);

    if (mode === "websocket" && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "subscribe",
          collection,
          query: { fields: ["*"] },
          uid: `sub_${collection}`,
        })
      );
    }

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        subscribersRef.current.delete(collection);
      }
    };
  }, [mode]);

  const sendCustom = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const reconnect = useCallback(() => {
    if (mode === "websocket") {
      if (socketRef.current) {
        socketRef.current.close();
      } else {
        connectWebSocket();
      }
    }
  }, [mode, connectWebSocket]);

  return (
    <RealtimeContext.Provider value={{ isConnected, mode, setMode, subscribe, sendCustom, reconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime() {
  return useContext(RealtimeContext);
}
