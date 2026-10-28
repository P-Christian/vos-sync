"use client";

// src/modules/freelancer/freelancer-messaging/hooks/useConversations.ts

import { useCallback, useState, useEffect, useRef } from "react";
import { Conversation } from "../types";
import {
  fetchConversations,
  archiveConversation,
} from "../providers/MessagingProvider";
import { useRealtime } from "@/modules/shared/providers/RealtimeProvider";

export function useConversations(activeConversationId?: number | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { subscribe } = useRealtime();

  const archivedFilterRef = useRef(false);
  const activeConversationIdRef = useRef<number | null>(activeConversationId ?? null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId ?? null;
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === activeConversationId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    }
  }, [activeConversationId]);

  const normalizeConversations = useCallback((data: Conversation[]): Conversation[] => {
    const activeId = activeConversationIdRef.current;
    if (!activeId) return data;
    return data.map((c) =>
      c.conversation_id === activeId ? { ...c, unread_count: 0 } : c
    );
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe("vs_messages", () => {
      fetchConversations({ archived: archivedFilterRef.current })
        .then((data) => {
          if (data) setConversations(normalizeConversations(data));
        })
        .catch(() => {});
    });
    return () => unsubscribe();
  }, [subscribe, normalizeConversations]);

  const loadConversations = useCallback(
    async (opts?: { archived?: boolean; silent?: boolean }) => {
      archivedFilterRef.current = opts?.archived ?? false;
      if (!opts?.silent) setLoading(true);
      setError("");
      try {
        const data = await fetchConversations(opts);
        setConversations(normalizeConversations(data));
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load conversations."
        );
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [normalizeConversations]
  );

  const archive = useCallback(
    async (conversationId: number, doArchive: boolean): Promise<boolean> => {
      setError("");
      try {
        await archiveConversation(conversationId, doArchive);
        setConversations((prev) =>
          prev.filter((c) => c.conversation_id !== conversationId)
        );
        return true;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to archive conversation."
        );
        return false;
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

  // Optimistic sidebar preview — no fetch, no skeleton
  const updateConversationPreview = useCallback(
    (conversationId: number, preview: string, sentAt: string) => {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.conversation_id === conversationId
            ? { ...c, last_message_preview: preview, last_message_at: sentAt }
            : c
        );
        // Float the updated conversation to the top
        const idx = updated.findIndex((c) => c.conversation_id === conversationId);
        if (idx > 0) {
          const [item] = updated.splice(idx, 1);
          updated.unshift(item);
        }
        return updated;
      });
    },
    []
  );

  return {
    conversations,
    loading,
    error,
    loadConversations,
    clearUnreadCount,
    updateConversationPreview,
    archive,
    clearError: () => setError(""),
  };
}
