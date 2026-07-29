"use client";

// src/modules/freelancer/freelancer-messaging/components/ConversationList.tsx

import React from "react";
import { Search, MessageSquare, RefreshCw, Archive } from "lucide-react";
import { Conversation } from "../types";
import ConversationItem from "./ConversationItem";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  activeConversationId: number | null;
  loading: boolean;
  searchQuery: string;
  showArchived: boolean;
  currentUserId: number;
  onSelect: (conv: Conversation) => void;
  onArchive: (conversationId: number) => void;
  onSearch: (q: string) => void;
  onRefresh: () => void;
  onToggleArchived: () => void;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  loading,
  searchQuery,
  showArchived,
  currentUserId,
  onSelect,
  onArchive,
  onSearch,
  onRefresh,
  onToggleArchived,
}: Props) {
  const [filterTab, setFilterTab] = React.useState<"ALL" | "UNREAD">("ALL");

  const totalUnread = conversations.filter((c) => (c.unread_count ?? 0) > 0).length;

  const filtered = conversations.filter((c) => {
    if (filterTab === "UNREAD" && (c.unread_count ?? 0) === 0) return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      c.other_party_name?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.last_message_preview?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Messages
            </span>
            <span
              className={cn(
                "h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold transition-all duration-300 ease-out origin-center pointer-events-none",
                totalUnread > 0
                  ? "scale-100 opacity-100 max-w-[60px]"
                  : "scale-0 opacity-0 max-w-0 px-0 min-w-0 overflow-hidden border-0"
              )}
            >
              <span
                key={totalUnread}
                className="inline-block animate-in zoom-in-50 fade-in duration-200 origin-center"
              >
                {totalUnread}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleArchived}
              title={showArchived ? "Hide archived" : "Show archived"}
              className={cn(
                "p-1.5 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
                showArchived &&
                  "bg-primary/10 text-primary"
              )}
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh"
              className="p-1.5 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-40"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-4 py-2 gap-2 bg-zinc-50/50 dark:bg-zinc-900/10 shrink-0">
        <button
          onClick={() => setFilterTab("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            filterTab === "ALL"
              ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilterTab("UNREAD")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
            filterTab === "UNREAD"
              ? "bg-rose-500 text-white"
              : "text-zinc-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400"
          )}
        >
          Unread
          {totalUnread > 0 && (
            <span className={cn(
              "h-4 min-w-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold",
              filterTab === "UNREAD" ? "bg-white text-rose-600" : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
            )}>
              {totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-2 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 px-6 text-center">
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <MessageSquare className="h-7 w-7 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {searchQuery ? "No results found" : showArchived ? "No archived messages" : "No messages yet"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "When employers message you about your applications, they will appear here."}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.conversation_id}
              conversation={conv}
              isActive={conv.conversation_id === activeConversationId}
              currentUserId={currentUserId}
              onSelect={onSelect}
              onArchive={onArchive}
            />
          ))
        )}
      </div>
    </div>
  );
}
