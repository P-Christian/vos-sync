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
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // ─── Load messages ─────────────────────────────────────────────────────

  const loadMessages = useCallback(async (conversationId: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load messages."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Refresh messages ──────────────────────────────────────────────────

  const refreshMessages = useCallback(
    async (conversationId: number) => {
      setError("");
      try {
        const data = await fetchMessages(conversationId);
        setMessages(data);
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
  }, []);

  return {
    messages,
    loading,
    sending,
    uploading,
    error,
    loadMessages,
    refreshMessages,
    send,
    upload,
    clearMessages,
    clearError: () => setError(""),
  };
}
