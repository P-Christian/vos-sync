"use client";

// src/modules/client/messaging/hooks/useMessages.ts

import { useCallback, useState } from "react";
import { Message, SendMessagePayload } from "../types";
import {
  fetchMessages,
  sendMessage,
  uploadFile,
} from "../providers/MessagingProvider";

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // ─── Load initial messages ───────────────────────────────────────────────

  const loadMessages = useCallback(async (conversationId: number) => {
    setLoading(true);
    setError("");
    setHasMore(true);
    try {
      const data = await fetchMessages(conversationId, { limit: 50, offset: 0 });
      setMessages(data);
      setHasMore(data.length >= 50);
      console.log(data)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load messages."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load older messages ──────────────────────────────────────────────────

  const loadOlderMessages = useCallback(async (conversationId: number) => {
    if (loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setError("");
    try {
      const currentOffset = messages.length;
      const olderData = await fetchMessages(conversationId, { limit: 50, offset: currentOffset });
      if (olderData.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) =>
          [...olderData, ...prev].sort((a, b) =>
            a.created_at.localeCompare(b.created_at)
          )
        );
        setHasMore(olderData.length >= 50);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load older messages."
      );
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages.length]);

  // ─── Refresh messages ──────────────────────────────────────────────────

  const refreshMessages = useCallback(
    async (conversationId: number) => {
      setError("");
      try {
        const data = await fetchMessages(conversationId, { limit: 50, offset: 0 });
        setMessages(data);
        setHasMore(data.length >= 50);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to refresh messages."
        );
      }
    },
    []
  );

  // ─── Send message ──────────────────────────────────────────────────────

  const send = useCallback(
    async (
      conversationId: number,
      payload: SendMessagePayload
    ): Promise<boolean> => {
      setSending(true);
      setError("");
      try {
        const newMsg = await sendMessage(conversationId, payload);
        setMessages((prev) => [...prev, newMsg]);
        return true;
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to send message."
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    []
  );

  // ─── Upload file ───────────────────────────────────────────────────────

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const result = await uploadFile(file);
      return result;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to upload file."
      );
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  // ─── Clear messages ────────────────────────────────────────────────────

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError("");
    setHasMore(true);
  }, []);

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    sending,
    uploading,
    error,
    loadMessages,
    loadOlderMessages,
    refreshMessages,
    send,
    upload,
    clearMessages,
    clearError: () => setError(""),
  };
}
