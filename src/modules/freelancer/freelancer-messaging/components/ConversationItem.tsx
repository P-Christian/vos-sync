"use client";

// src/modules/freelancer/freelancer-messaging/components/ConversationItem.tsx

import React from "react";
import { Archive, ArchiveRestore, Briefcase } from "lucide-react";
import { Conversation } from "../types";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: number;
  onSelect: (conv: Conversation) => void;
  onArchive: (conversationId: number) => void;
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-PH", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onArchive,
}: Props) {
  const [imgError, setImgError] = React.useState(false);
  const {
    conversation_id,
    other_party_name = "Unknown Employer",
    other_party_avatar,
    job_title,
    unread_count = 0,
    last_message_preview = "",
    last_message_at,
    archived_by_freelancer,
  } = conversation;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(conversation)}
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-zinc-100 dark:border-zinc-800/60",
        isActive
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-l-emerald-500"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 border-l-2 border-l-transparent"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0 mt-0.5">
        {other_party_avatar && !imgError ? (
          <img
            src={other_party_avatar}
            alt={other_party_name}
            onError={() => setImgError(true)}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
          />
        ) : (
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-white dark:ring-zinc-900",
              isActive
                ? "bg-emerald-600 text-white"
                : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
            )}
          >
            {getInitials(other_party_name)}
          </div>
        )}
        {unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unread_count > 9 ? "9+" : unread_count}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-semibold truncate",
              unread_count > 0
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-700 dark:text-zinc-300"
            )}
          >
            {other_party_name}
          </span>
          <span className="text-[10px] text-zinc-400 shrink-0">
            {formatTime(last_message_at)}
          </span>
        </div>

        {job_title && (
          <div className="flex items-center gap-1 mt-0.5">
            <Briefcase className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate font-medium">
              {job_title}
            </span>
          </div>
        )}

        <p
          className={cn(
            "text-xs mt-0.5 truncate",
            unread_count > 0
              ? "text-zinc-600 dark:text-zinc-300 font-medium"
              : "text-zinc-400 dark:text-zinc-500"
          )}
        >
          {last_message_preview || "No messages yet"}
        </p>
      </div>

      {/* Archive button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onArchive(conversation_id);
        }}
        title={archived_by_freelancer ? "Unarchive" : "Archive"}
        className="absolute right-3 top-3.5 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400 transition-all"
      >
        {archived_by_freelancer ? (
          <ArchiveRestore className="h-3.5 w-3.5" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
