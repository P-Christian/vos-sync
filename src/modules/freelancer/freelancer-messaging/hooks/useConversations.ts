"use client";

// src/modules/freelancer/freelancer-messaging/hooks/useConversations.ts

import { useCallback, useState, useEffect } from "react";
import { Conversation } from "../types";
import {
  fetchConversations,
  archiveConversation,
} from "../providers/MessagingProvider";
import { useRealtime } from "@/modules/shared/providers/RealtimeProvider";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribe("vs_messages", () => {
      fetchConversations()
        .then((data) => {
          if (data) setConversations(data);
        })
        .catch(() => {});
    });
    return () => unsubscribe();
  }, [subscribe]);

  const loadConversations = useCallback(
    async (opts?: { archived?: boolean }) => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchConversations(opts);
        setConversations(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load conversations."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const archive = useCallback(
    async (conversationId: number, doArchive: boolean) => {
      setError("");
      try {
        await archiveConversation(conversationId, doArchive);
        setConversations((prev) =>
          prev.filter((c) => c.conversation_id !== conversationId)
        );
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to archive conversation."
        );
      }
    },
    []
  );

  const clearUnreadCount = useCallback((conversationId: number) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === conversationId
          ? { ...c, unread_count: 0 }
          : c
      )
    );
  }, []);

  return {
    conversations,
    loading,
    error,
    loadConversations,
    clearUnreadCount,
    archive,
    clearError: () => setError(""),
  };
}
