// src/modules/client/messaging/providers/MessagingProvider.ts

import {
  Conversation,
  Message,
  CreateConversationPayload,
  SendMessagePayload,
} from "../types";

const BASE = "/api/client/messaging";

// ─── Fetch conversations ───────────────────────────────────────────────────

export async function fetchConversations(params?: {
  archived?: boolean;
}): Promise<Conversation[]> {
  const qs = params?.archived ? "?archived=true" : "";
  const res = await fetch(`${BASE}${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch conversations.");
  return json.conversations ?? [];
}

// ─── Create or get conversation ────────────────────────────────────────────

export async function createConversation(
  payload: CreateConversationPayload
): Promise<{ conversation: Conversation; created: boolean }> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create conversation.");
  return json;
}

// ─── Fetch messages ────────────────────────────────────────────────────────

export async function fetchMessages(
  conversationId: number,
  params?: { limit?: number; offset?: number }
): Promise<Message[]> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));

  const res = await fetch(
    `${BASE}/${conversationId}/messages${qs.toString() ? `?${qs}` : ""}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch messages.");
  return json.messages ?? [];
}

// ─── Send message ──────────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: number,
  payload: SendMessagePayload
): Promise<Message> {
  const res = await fetch(`${BASE}/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to send message.");
  return json.message;
}

// ─── Archive conversation ──────────────────────────────────────────────────

export async function archiveConversation(
  conversationId: number,
  archive: boolean
): Promise<void> {
  const res = await fetch(`${BASE}/${conversationId}/archive`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archive }),
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.error ?? "Failed to archive conversation.");
}

// ─── Upload file ───────────────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<{
  file_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to upload file.");
  return json;
}
