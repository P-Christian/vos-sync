"use client";

// src/modules/freelancer/freelancer-messaging/hooks/useMessages.ts

import { useCallback, useState, useEffect, useRef } from "react";
import { CelebrationEvent, Message, SendMessagePayload } from "../types";
import {
  fetchMessages,
  sendMessage,
  uploadFile,
  toggleReaction,
} from "../providers/MessagingProvider";
import { useRealtime } from "@/modules/shared/providers/RealtimeProvider";
import { toast } from "sonner";

function parseLocalDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  const [datePart = "", timePart = "00:00:00"] = dateStr.replace("T", " ").split(" ");
  const [year = 1970, month = 1, day = 1] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

function sortChronologically(list: Message[]): Message[] {
  return [...list].sort((a, b) => parseLocalDateMs(a.created_at) - parseLocalDateMs(b.created_at));
}

function getLocalTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function useMessages(currentUserId: number = 0) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const activeConversationIdRef = useRef<number | null>(null);
  const pendingPayloadsRef = useRef<
    Map<number, { conversationId: number; payload: SendMessagePayload }>
  >(new Map());

  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribe("vs_messages", ({ event, data }) => {
      if (event === "create" && data && data.length > 0) {
        data.forEach((item) => {
          const rawMsg = item as unknown as Message;
          if (!rawMsg.attachments) rawMsg.attachments = [];
          if (!rawMsg.reactions) rawMsg.reactions = [];
          const currentConvId = activeConversationIdRef.current;
          if (!currentConvId || Number(rawMsg.conversation_id) === currentConvId) {
            setMessages((prev) => {
              if (prev.some((m) => m.message_id === rawMsg.message_id)) return prev;
              return sortChronologically([...prev, rawMsg]);
            });
          }
        });

        // Background-refresh to populate attachments, reactions, or system card metadata
        const activeId = activeConversationIdRef.current;
        if (activeId) {
          fetchMessages(activeId, { limit: 50, offset: 0 })
            .then((result) => {
              const latestMessages = result.messages;
              if (latestMessages && latestMessages.length > 0) {
                setMessages((prev) => {
                  const map = new Map<number, Message>();
                  for (const m of prev) map.set(m.message_id, m);
                  for (const m of latestMessages) map.set(m.message_id, m);
                  return sortChronologically(Array.from(map.values()));
                });
              }
            })
            .catch(() => {});
        }
      } else {
        // Polling tick or generic update event — fetch latest messages for active conversation
        const activeId = activeConversationIdRef.current;
        if (activeId) {
          fetchMessages(activeId, { limit: 50, offset: 0 })
            .then((result) => {
              const latestMessages = result.messages;
              if (latestMessages && latestMessages.length > 0) {
                setMessages((prev) => {
                  const map = new Map<number, Message>();
                  for (const m of prev) map.set(m.message_id, m);
                  let newFound = false;
                  for (const m of latestMessages) {
                    if (!map.has(m.message_id)) {
                      map.set(m.message_id, m);
                      newFound = true;
                    }
                  }
                  if (!newFound) return prev;
                  return sortChronologically(Array.from(map.values()));
                });
              }
            })
            .catch(() => {});
        }
      }
    });

    return () => unsubscribe();
  }, [subscribe]);

  const loadMessages = useCallback(async (conversationId: number) => {
    activeConversationIdRef.current = conversationId;
    setLoading(true);
    setError("");
    setHasMore(true);
    try {
      const result = await fetchMessages(conversationId, { limit: 50, offset: 0 });
      setError("");
      setMessages(sortChronologically(result.messages));
      if (result.celebration) {
        setCelebration(result.celebration);
      }
      setHasMore(result.messages.length >= 50);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load messages.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOlderMessages = useCallback(async (conversationId: number) => {
    if (loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setError("");
    try {
      const currentOffset = messages.length;
      const result = await fetchMessages(conversationId, { limit: 50, offset: currentOffset });
      const olderData = result.messages;
      if (olderData.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => {
          const combined = [...olderData, ...prev];
          const map = new Map<number, Message>();
          for (const m of combined) map.set(m.message_id, m);
          return sortChronologically(Array.from(map.values()));
        });
        setHasMore(olderData.length >= 50);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load older messages.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages.length]);

  const refreshMessages = useCallback(
    async (conversationId: number) => {
      setError("");
      try {
        const result = await fetchMessages(conversationId, { limit: 50, offset: 0 });
        setError("");
        setMessages(sortChronologically(result.messages));
        setHasMore(result.messages.length >= 50);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to refresh messages.";
        setError(msg);
        toast.error(msg);
      }
    },
    []
  );

  // ─── Send message with up to 5 retries ────────────────────────────────
  const executeSendWithRetry = useCallback(
    async (
      tempId: number,
      conversationId: number,
      payload: SendMessagePayload
    ): Promise<boolean> => {
      setError("");

      const MAX_RETRIES = 5;
      let attempts = 0;
      let successMsg: Message | null = null;
      let lastError: unknown = null;

      while (attempts <= MAX_RETRIES) {
        try {
          successMsg = await sendMessage(conversationId, payload);
          break;
        } catch (err) {
          lastError = err;
          attempts++;
          if (attempts <= MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (successMsg) {
        const finalMsg = successMsg;
        pendingPayloadsRef.current.delete(tempId);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.message_id === tempId);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...finalMsg, delivery_status: "sent" };
            return sortChronologically(next);
          }
          if (prev.some((m) => m.message_id === finalMsg.message_id)) return prev;
          return sortChronologically([...prev, { ...finalMsg, delivery_status: "sent" }]);
        });

        // Hide "sent" status after 2 seconds
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.message_id === finalMsg.message_id && m.delivery_status === "sent"
                ? { ...m, delivery_status: undefined }
                : m
            )
          );
        }, 2000);

        return true;
      } else {
        // All 5 retries failed
        setMessages((prev) =>
          prev.map((m) =>
            m.message_id === tempId
              ? { ...m, delivery_status: "failed" }
              : m
          )
        );
        const msg = lastError instanceof Error ? lastError.message : "Failed to send message.";
        setError(msg);
        toast.error("Failed to send message after 5 retries.");
        return false;
      }
    },
    []
  );

  const send = useCallback(
    async (
      conversationId: number,
      payload: SendMessagePayload
    ): Promise<boolean> => {
      const tempId = -Date.now();
      const optimisticMsg: Message = {
        message_id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        message_type: payload.message_type ?? "TEXT",
        message_content: payload.message_content ?? null,
        is_edited: false,
        edited_at: null,
        created_at: getLocalTimestamp(),
        is_deleted: false,
        attachments: (payload.attachments ?? []).map((att, i) => ({
          attachment_id: -i - 1,
          message_id: tempId,
          file_name: att.file_name,
          file_path: att.file_path,
          file_size: att.file_size ?? null,
          mime_type: att.mime_type ?? null,
          created_at: getLocalTimestamp(),
        })),
        delivery_status: "sending",
      };

      pendingPayloadsRef.current.set(tempId, { conversationId, payload });
      setMessages((prev) => sortChronologically([...prev, optimisticMsg]));

      // Execute retry loop in background
      void executeSendWithRetry(tempId, conversationId, payload);
      return true;
    },
    [currentUserId, executeSendWithRetry]
  );

  const retry = useCallback(
    async (messageId: number): Promise<boolean> => {
      const entry = pendingPayloadsRef.current.get(messageId);
      if (!entry) return false;

      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === messageId ? { ...m, delivery_status: "sending" } : m
        )
      );

      return executeSendWithRetry(messageId, entry.conversationId, entry.payload);
    },
    [executeSendWithRetry]
  );

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const result = await uploadFile(file);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload file.";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const toggleMessageReaction = useCallback(
    async (messageId: number, reaction: string) => {
      // Optimistic update
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.message_id !== messageId) return msg;
          const currentReactions = msg.reactions ?? [];

          // Remove any other reaction currently reacted by me
          let nextReactions = currentReactions
            .map((r) => {
              if (r.reacted_by_me && r.reaction !== reaction) {
                return { ...r, count: r.count - 1, reacted_by_me: false };
              }
              return r;
            })
            .filter((r) => r.count > 0);

          const existingTarget = nextReactions.find(
            (r) => r.reaction === reaction
          );

          if (existingTarget) {
            if (existingTarget.reacted_by_me) {
              // Toggled off same emoji
              if (existingTarget.count <= 1) {
                nextReactions = nextReactions.filter(
                  (r) => r.reaction !== reaction
                );
              } else {
                nextReactions = nextReactions.map((r) =>
                  r.reaction === reaction
                    ? {
                        ...r,
                        count: r.count - 1,
                        reacted_by_me: false,
                      }
                    : r
                );
              }
            } else {
              // Switched to this emoji
              nextReactions = nextReactions.map((r) =>
                r.reaction === reaction
                  ? {
                      ...r,
                      count: r.count + 1,
                      reacted_by_me: true,
                    }
                  : r
              );
            }
          } else {
            // New emoji selected
            nextReactions.push({
              reaction,
              count: 1,
              reacted_by_me: true,
              users: [],
            });
          }

          return {
            ...msg,
            reactions: nextReactions,
          };
        })
      );

      try {
        const updatedReactions = await toggleReaction(messageId, reaction);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === messageId
              ? { ...msg, reactions: updatedReactions }
              : msg
          )
        );
      } catch (err: unknown) {
        const activeId = activeConversationIdRef.current;
        if (activeId) {
          fetchMessages(activeId, { limit: 50, offset: 0 })
            .then((result) => {
              if (result?.messages) setMessages(sortChronologically(result.messages));
            })
            .catch(() => {});
        }
        const msg = err instanceof Error ? err.message : "Failed to update reaction.";
        setError(msg);
        toast.error(msg);
      }
    },
    []
  );

  // Listen for programmatic celebration triggers (e.g. from HiredCard)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<CelebrationEvent>;
      if (customEvent.detail) {
        setCelebration(customEvent.detail);
      }
    };
    window.addEventListener("vos:trigger-celebration", handleTrigger);
    return () => {
      window.removeEventListener("vos:trigger-celebration", handleTrigger);
    };
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError("");
    setHasMore(true);
    setCelebration(null);
  }, []);

  const dismissCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  const triggerCelebration = useCallback((event: CelebrationEvent) => {
    setCelebration(event);
  }, []);

  return {
    messages,
    celebration,
    dismissCelebration,
    triggerCelebration,
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
    retry,
    upload,
    toggleReaction: toggleMessageReaction,
    clearMessages,
    clearError: () => setError(""),
  };
}
