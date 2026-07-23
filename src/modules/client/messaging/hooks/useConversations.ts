"use client";

// src/modules/client/messaging/hooks/useConversations.ts

import { useCallback, useState } from "react";
import { Conversation, CreateConversationPayload } from "../types";
import {
  fetchConversations,
  createConversation,
  archiveConversation,
} from "../providers/MessagingProvider";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ─── Load conversations ────────────────────────────────────────────────

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

  // ─── Create or get conversation ────────────────────────────────────────

  const openOrCreateConversation = useCallback(
    async (
      payload: CreateConversationPayload
    ): Promise<Conversation | null> => {
      setError("");
      try {
        const { conversation } = await createConversation(payload);
        // Add to list if not already present
        setConversations((prev) => {
          const exists = prev.some(
            (c) => c.conversation_id === conversation.conversation_id
          );
          if (exists) {
            return prev.map((c) =>
              c.conversation_id === conversation.conversation_id
                ? conversation
                : c
            );
          }
          return [conversation, ...prev];
        });
        return conversation;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to open conversation."
        );
        return null;
      }
    },
    []
  );

  // ─── Archive conversation ──────────────────────────────────────────────

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
    openOrCreateConversation,
    clearUnreadCount,
    archive,
    clearError: () => setError(""),
  };
}
