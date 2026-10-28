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
    "deleted_at",
    "deleted_by",
    "reply_to_message_id",
    "is_pinned",
    "pinned_at",
    "pinned_by",
    // Participant IDs for server-side SSE scoping — resolved via relational query
    "conversation_id.client_id",
    "conversation_id.freelancer_id",
    // Sender user information for notifications — resolved via relational query
    "sender_id.user_id",
    "sender_id.user_fname",
    "sender_id.user_lname",
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

const userSenderNameCache = new Map<number, string>();

export async function resolveSenderName(userId: number): Promise<string | null> {
  if (userSenderNameCache.has(userId)) return userSenderNameCache.get(userId)!;
  try {
    const raw =
      process.env.DIRECTUS_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8055";
    const base = raw.replace(/\/$/, "");
    const token =
      process.env.DIRECTUS_STATIC_TOKEN?.trim() ||
      process.env.WEBSOCKET_ACCESS_TOKEN?.trim() ||
      "";
    const res = await fetch(
      `${base}/items/vs_user/${userId}?fields=user_fname,user_lname`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      }
    );
    if (res.ok) {
      const json = await res.json();
      const u = json.data;
      if (u) {
        const fname = typeof u.user_fname === "string" ? u.user_fname.trim() : "";
        const lname = typeof u.user_lname === "string" ? u.user_lname.trim() : "";
        const fullName = `${fname} ${lname}`.trim();
        if (fullName) {
          userSenderNameCache.set(userId, fullName);
          return fullName;
        }
      }
    }
  } catch (err) {
    console.error("[DirectusRelay] Failed to resolve sender name for userId", userId, err);
  }
  return null;
}

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

      ws.onmessage = async (event) => {
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

            // Decrypt message_content, resolve sender_name, and flatten conversation participant IDs for vs_message records
            if (collection === "vs_message") {
              for (const rec of records) {
                if (typeof rec.message_content === "string") {
                  rec.message_content = safeDecryptMessage(rec.message_content) ?? rec.message_content;
                }
                // Flatten nested relation: conversation_id: { client_id, freelancer_id }
                if (rec.conversation_id && typeof rec.conversation_id === "object") {
                  const conv = rec.conversation_id as Record<string, unknown>;
                  rec.client_id = conv.client_id ?? null;
                  rec.freelancer_id = conv.freelancer_id ?? null;
                  // Replace the nested object with just the numeric ID if present
                  if (typeof conv.conversation_id === "number") {
                    rec.conversation_id = conv.conversation_id;
                  }
                }
                // Resolve sender name and normalize sender_id
                if (rec.sender_id && typeof rec.sender_id === "object") {
                  const sender = rec.sender_id as Record<string, unknown>;
                  const fname = typeof sender.user_fname === "string" ? sender.user_fname.trim() : "";
                  const lname = typeof sender.user_lname === "string" ? sender.user_lname.trim() : "";
                  const fullName = `${fname} ${lname}`.trim();
                  if (fullName) {
                    rec.sender_name = fullName;
                    if (typeof sender.user_id === "number") {
                      userSenderNameCache.set(sender.user_id, fullName);
                    }
                  }
                  if (sender.user_id !== undefined) {
                    rec.sender_id = sender.user_id;
                  }
                } else if (typeof rec.sender_id === "number") {
                  if (userSenderNameCache.has(rec.sender_id)) {
                    rec.sender_name = userSenderNameCache.get(rec.sender_id);
                  } else {
                    const resolved = await resolveSenderName(rec.sender_id);
                    if (resolved) {
                      rec.sender_name = resolved;
                    }
                  }
                }
              }
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

  public destroy() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.emitter.removeAllListeners();
  }

  public subscribeAll() {
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

// In development, reset stale singleton on hot-reload so updated subscriptions take effect
if (process.env.NODE_ENV !== "production" && globalForRelay.__directusWsRelay) {
  try {
    globalForRelay.__directusWsRelay.destroy();
  } catch {}
  delete globalForRelay.__directusWsRelay;
}

export const directusWsRelay =
  globalForRelay.__directusWsRelay ?? new DirectusWsRelay();

if (process.env.NODE_ENV !== "production") {
  globalForRelay.__directusWsRelay = directusWsRelay;
}

export function ensureDirectusRelayStarted() {
  directusWsRelay.start();
  directusWsRelay.subscribeAll();
}
