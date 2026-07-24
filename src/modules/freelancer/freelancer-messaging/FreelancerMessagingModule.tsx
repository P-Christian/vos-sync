"use client";

// src/modules/freelancer/freelancer-messaging/FreelancerMessagingModule.tsx

import React, { useEffect, useState, useCallback } from "react";
import { MessageSquare, AlertCircle } from "lucide-react";
import { useConversations } from "./hooks/useConversations";
import { useMessages } from "./hooks/useMessages";
import ConversationList from "./components/ConversationList";
import ChatPanel from "./components/ChatPanel";
import EmptyState from "./components/EmptyState";
import { Conversation } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  currentUserId: number;
}

export default function FreelancerMessagingModule({ currentUserId }: Props) {
  const {
    conversations,
    loading: convsLoading,
    error: convsError,
    loadConversations,
    clearUnreadCount,
    archive,
    clearError: clearConvsError,
  } = useConversations();

  const {
    messages,
    loading: msgsLoading,
    sending,
    uploading,
    error: msgsError,
    loadMessages,
    refreshMessages,
    send,
    upload,
    clearMessages,
  } = useMessages();

  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  useEffect(() => {
    loadConversations({ archived: showArchived });
  }, [loadConversations, showArchived]);

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      clearUnreadCount(conv.conversation_id);
      if (activeConversation?.conversation_id === conv.conversation_id) return;
      clearMessages();
      setActiveConversation({ ...conv, unread_count: 0 });
      loadMessages(conv.conversation_id);
      setMobileShowChat(true);
    },
    [activeConversation, clearMessages, clearUnreadCount, loadMessages]
  );

  const handleRefreshConversations = useCallback(() => {
    loadConversations({ archived: showArchived });
  }, [loadConversations, showArchived]);

  const handleRefreshMessages = useCallback(() => {
    if (activeConversation) {
      refreshMessages(activeConversation.conversation_id);
    }
  }, [activeConversation, refreshMessages]);

  const handleArchive = useCallback(
    async (conversationId: number) => {
      await archive(conversationId, true);
      if (activeConversation?.conversation_id === conversationId) {
        setActiveConversation(null);
        clearMessages();
        setMobileShowChat(false);
      }
    },
    [archive, activeConversation, clearMessages]
  );

  const handleSend = useCallback(
    async (content: string, files: File[]) => {
      if (!activeConversation) return;

      let attachments: {
        file_name: string;
        file_path: string;
        file_size: number;
        mime_type: string;
      }[] = [];

      if (files.length > 0) {
        const uploaded = await Promise.all(files.map((f) => upload(f)));
        attachments = uploaded
          .filter((r) => r !== null)
          .map((r) => ({
            file_name: r!.file_name,
            file_path: r!.file_path,
            file_size: r!.file_size,
            mime_type: r!.mime_type,
          }));
      }

      const messageType =
        attachments.length > 0 && !content
          ? attachments[0].mime_type.startsWith("image/")
            ? "IMAGE"
            : "FILE"
          : "TEXT";

      await send(activeConversation.conversation_id, {
        message_content: content || undefined,
        message_type: messageType,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      loadConversations({ archived: showArchived });
    },
    [activeConversation, upload, send, loadConversations, showArchived]
  );

  const handleToggleArchived = useCallback(() => {
    setShowArchived((prev) => !prev);
    setActiveConversation(null);
    clearMessages();
  }, [clearMessages]);

  return (
    <div className="space-y-6 freelancer-page-transition">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .freelancer-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-4 bg-gradient-to-br from-emerald-950 via-zinc-900 to-teal-950 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20 relative z-10 shrink-0">
          <MessageSquare className="h-7 w-7" />
        </div>
        <div className="relative z-10">
          <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-zinc-300 mt-1">
            Communicate directly with clients and hiring managers
          </p>
        </div>
      </div>

      {/* Error */}
      {convsError && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {convsError}
          <button onClick={clearConvsError} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="flex h-[calc(100vh-330px)] min-h-[500px]">
          <div
            className={cn(
              "w-full sm:w-80 lg:w-96 shrink-0 flex flex-col",
              mobileShowChat ? "hidden sm:flex" : "flex"
            )}
          >
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversation?.conversation_id ?? null}
              loading={convsLoading}
              searchQuery={searchQuery}
              showArchived={showArchived}
              currentUserId={currentUserId}
              onSelect={handleSelectConversation}
              onArchive={handleArchive}
              onSearch={setSearchQuery}
              onRefresh={handleRefreshConversations}
              onToggleArchived={handleToggleArchived}
            />
          </div>

          <div
            className={cn(
              "flex-1 min-w-0 h-full flex flex-col overflow-hidden",
              mobileShowChat ? "flex" : "hidden sm:flex"
            )}
          >
            {activeConversation ? (
              <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                <ChatPanel
                  conversation={activeConversation}
                  messages={messages}
                  currentUserId={currentUserId}
                  loading={msgsLoading}
                  sending={sending}
                  uploading={uploading}
                  error={msgsError}
                  onSend={handleSend}
                  onRefresh={handleRefreshMessages}
                  onBack={() => setMobileShowChat(false)}
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                <EmptyState />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
