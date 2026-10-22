"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { toast } from "sonner";
import type {
  ContactMessage,
  ContactMessageStatus,
} from "../types/contact-message.types";

export interface ContactMessageFilters {
  status: ContactMessageStatus | "all";
  search: string;
  page: number;
  pageSize: number;
}

export function useContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ContactMessageFilters>({
    status: "all",
    search: "",
    page: 1,
    pageSize: 15,
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/vos-admin/contact-messages/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Number(data.unreadCount ?? 0));
      }
    } catch {
      // non-blocking
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters.status !== "all") query.set("status", filters.status);
      if (filters.search.trim()) query.set("q", filters.search.trim());
      query.set("page", String(filters.page));
      query.set("pageSize", String(filters.pageSize));

      const res = await fetch(`/api/vos-admin/contact-messages?${query.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch messages (${res.status})`);
      }

      const data = await res.json();
      startTransition(() => {
        setMessages(data.items ?? []);
        setTotal(Number(data.total ?? 0));
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred while loading messages";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const selectMessage = useCallback(async (id: number | null) => {
    setSelectedId(id);
    if (!id) {
      setSelectedMessage(null);
      return;
    }

    setDetailLoading(true);
    try {
      const res = await fetch(`/api/vos-admin/contact-messages/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load message (${res.status})`);
      }
      const data = await res.json();
      const item: ContactMessage = data.item;
      setSelectedMessage(item);

      // If it was 'new', it has now auto-advanced to 'read' on server
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: item.status, reviewed_at: item.reviewed_at } : m))
      );
      fetchUnreadCount();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load message details";
      toast.error(msg);
      setSelectedMessage(null);
    } finally {
      setDetailLoading(false);
    }
  }, [fetchUnreadCount]);

  const updateMessage = useCallback(
    async (
      id: number,
      patch: { status?: ContactMessageStatus; internal_note?: string }
    ) => {
      setUpdating(true);
      try {
        const res = await fetch(`/api/vos-admin/contact-messages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update message");
        }

        const data = await res.json();
        const updated: ContactMessage = data.item;

        setSelectedMessage(updated);
        setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
        toast.success("Message updated successfully");
        fetchUnreadCount();
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error updating message";
        toast.error(msg);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [fetchUnreadCount]
  );

  const deleteMessage = useCallback(
    async (id: number) => {
      setUpdating(true);
      try {
        const res = await fetch(`/api/vos-admin/contact-messages/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to delete message");
        }

        setMessages((prev) => prev.filter((m) => m.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        if (selectedId === id) {
          setSelectedId(null);
          setSelectedMessage(null);
        }
        toast.success("Message removed");
        fetchUnreadCount();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error deleting message";
        toast.error(msg);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [selectedId, fetchUnreadCount]
  );

  const setStatusFilter = useCallback((status: ContactMessageStatus | "all") => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    messages,
    total,
    unreadCount,
    loading,
    error,
    filters,
    selectedId,
    selectedMessage,
    detailLoading,
    updating,
    setStatusFilter,
    setSearch,
    setPage,
    selectMessage,
    updateMessage,
    deleteMessage,
    refresh: fetchMessages,
  };
}
