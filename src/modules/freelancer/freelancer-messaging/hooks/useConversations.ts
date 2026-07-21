"use client";

// src/modules/freelancer/freelancer-messaging/hooks/useConversations.ts

import { useCallback, useState } from "react";
import { Conversation } from "../types";
import {
  fetchConversations,
  archiveConversation,
} from "../providers/MessagingProvider";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return {
    conversations,
    loading,
    error,
    loadConversations,
    archive,
    clearError: () => setError(""),
  };
}
