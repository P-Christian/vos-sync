// src/lib/realtime/directus-ws-relay.ts

import { EventEmitter } from "events";
import { safeDecryptMessage } from "@/lib/message-encryption";

export interface RelayEventPayload {
  collection: string;
  event: string;
  data: Record<string, unknown>[];
}

const COLLECTION_QUERY_FIELDS: Record<string, string[]> = {
  vs_message: [
    "message_id",
    "conversation_id",
    "sender_id",
    "message_type",
    "message_content",
    "is_edited",
    "edited_at",
    "created_at",
    "is_deleted",
  ],
  vs_message_reaction: [
    "reaction_id",
    "message_id",
    "user_id",
    "reaction",
    "created_at",
  ],
  vs_freelancer_notification: [
    "id",
    "user_id",
    "title",
    "message",
    "type",
    "is_read",
    "created_at",
  ],
  vs_employer_notification: [
    "id",
    "user_id",
    "title",
    "message",
    "type",
    "is_read",
    "created_at",
  ],
  vs_interview: [
    "id",
    "title",
    "scheduled_at",
    "status",
    "created_at",
  ],
  vs_job_application: [
    "id",
    "status",
    "applicant_id",
    "job_id",
    "updated_at",
  ],
};

const SUBSCRIBED_COLLECTIONS = [
  "vs_message",
  "vs_message_reaction",
  "vs_freelancer_notification",
  "vs_employer_notification",
  "vs_interview",
  "vs_job_application",
];

class DirectusWsRelay {
  private ws: WebSocket | null = null;
  private emitter = new EventEmitter();
  private isConnecting = false;
  private isConnected = false;
  private retryCount = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  public onEvent(listener: (payload: RelayEventPayload) => void): () => void {
    this.emitter.on("event", listener);
    return () => {
      this.emitter.off("event", listener);
    };
  }

  public start() {
    if (this.isConnected || this.isConnecting) return;
    this.connect();
  }

  private getWebSocketUrl(): string {
    const raw =
      process.env.DIRECTUS_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8055";

    const clean = raw.replace(/\/$/, "");
    const isSsl = clean.startsWith("https://") || clean.startsWith("wss://");
    const proto = isSsl ? "wss://" : "ws://";
    const host = clean.replace(/^(?:https?|wss?):\/\//, "");
    return `${proto}${host}/websocket`;
  }

  private connect() {
    this.isConnecting = true;
    const url = this.getWebSocketUrl();
    const token =
      process.env.WEBSOCKET_ACCESS_TOKEN?.trim() ||
      process.env.DIRECTUS_STATIC_TOKEN?.trim() ||
      "";

    try {
      console.log("[DirectusRelay] Connecting server WebSocket to:", url);
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.isConnecting = false;
        this.retryCount = 0;
        console.log("[DirectusRelay] WebSocket OPENED. Sending Directus auth handshake...");
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));

          if (msg.type === "auth") {
            if (msg.status === "ok") {
              this.isConnected = true;
              console.log("[DirectusRelay] ✅ Authenticated with Directus WebSocket.");
              this.subscribeAll();
            } else {
              this.isConnected = false;
              console.error("[DirectusRelay] ❌ Authentication failed:", msg.error);
            }
            return;
          }

          if (msg.type === "subscription" && msg.data) {
            let collection = msg.collection || "";
            if (!collection && msg.uid) {
              collection = msg.uid
                .replace(/^sub_/, "")
                .replace(/_(?:create|update|delete|init)$/, "");
            }

            const records = Array.isArray(msg.data)
              ? (msg.data as Record<string, unknown>[])
              : [];
            const eventType = msg.event || "update";

            // Decrypt message_content for vs_message records before forwarding to clients
            if (collection === "vs_message") {
              records.forEach((rec) => {
                if (typeof rec.message_content === "string") {
                  rec.message_content = safeDecryptMessage(rec.message_content) ?? rec.message_content;
                }
              });
            }

            if (collection && records.length > 0) {
              this.emitter.emit("event", {
                collection,
                event: eventType,
                data: records,
              });
            }
          }
        } catch (e) {
          console.error("[DirectusRelay] Error parsing WebSocket frame:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("[DirectusRelay] WebSocket error:", err);
      };

      ws.onclose = (evt) => {
        this.isConnecting = false;
        this.isConnected = false;
        this.ws = null;
        console.warn(`[DirectusRelay] WebSocket CLOSED (code: ${evt.code}, reason: ${evt.reason || "none"})`);

        const delay = Math.min(30000, 2000 * Math.pow(1.5, this.retryCount));
        this.retryCount++;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, delay);
      };
    } catch (e) {
      this.isConnecting = false;
      this.isConnected = false;
      console.error("[DirectusRelay] Exception starting WebSocket:", e);
    }
  }

  private subscribeAll() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    SUBSCRIBED_COLLECTIONS.forEach((collection) => {
      const fields = COLLECTION_QUERY_FIELDS[collection] || ["id"];
      const events = ["create", "update"];

      events.forEach((event) => {
        this.ws?.send(
          JSON.stringify({
            type: "subscribe",
            collection,
            event,
            query: { fields },
            uid: `sub_${collection}_${event}`,
          })
        );
      });
    });
    console.log("[DirectusRelay] 📡 Subscriptions registered for all target collections.");
  }
}

// Preserve singleton across Next.js hot module reloads
const globalForRelay = globalThis as unknown as {
  __directusWsRelay?: DirectusWsRelay;
};

export const directusWsRelay =
  globalForRelay.__directusWsRelay ?? new DirectusWsRelay();

if (process.env.NODE_ENV !== "production") {
  globalForRelay.__directusWsRelay = directusWsRelay;
}

export function ensureDirectusRelayStarted() {
  directusWsRelay.start();
}
