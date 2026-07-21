"use client";

// src/modules/freelancer/freelancer-messaging/components/ChatPanel.tsx

import React, { useEffect, useRef } from "react";
import {
  RefreshCw,
  Briefcase,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Conversation, Message } from "../types";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { cn } from "@/lib/utils";

interface Props {
  conversation: Conversation;
  messages: Message[];
  currentUserId: number;
  loading: boolean;
  sending: boolean;
  uploading: boolean;
  error: string;
  onSend: (content: string, files: File[]) => void;
  onRefresh: () => void;
  onBack?: () => void;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function isSameDayStr(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function ChatPanel({
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  uploading,
  error,
  onSend,
  onRefresh,
  onBack,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = React.useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const {
    other_party_name = "Employer",
    other_party_avatar,
    other_party_email,
    job_title,
    conversation_type,
  } = conversation;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        {other_party_avatar && !imgError ? (
          <img
            src={other_party_avatar}
            alt={other_party_name}
            onError={() => setImgError(true)}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900 shrink-0"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {getInitials(other_party_name)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {other_party_name}
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
              {conversation_type === "JOB_APPLICATION"
                ? "Job Opportunity"
                : conversation_type === "DIRECT_MESSAGE"
                ? "Direct"
                : "Support"}
            </span>
          </div>
          {(job_title || other_party_email) && (
            <div className="flex items-center gap-2 mt-0.5">
              {job_title && (
                <div className="flex items-center gap-1">
                  <Briefcase className="h-2.5 w-2.5 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                    {job_title}
                  </span>
                </div>
              )}
              {other_party_email && !job_title && (
                <span className="text-[10px] text-zinc-400 truncate">
                  {other_party_email}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh messages"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 shrink-0"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-zinc-50/50 dark:bg-zinc-950/20">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                No messages yet
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Send a message to reply to the employer
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === currentUserId;
              const prevMsg = messages[index - 1];
              const showDateDivider =
                !prevMsg ||
                !isSameDayStr(prevMsg.created_at, msg.created_at);
              return (
                <MessageBubble
                  key={msg.message_id}
                  message={msg}
                  isOwn={isOwn}
                  showDateDivider={showDateDivider}
                  dateLabel={showDateDivider ? getDateLabel(msg.created_at) : undefined}
                />
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-900/30 text-xs text-rose-600 dark:text-rose-400 shrink-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Input */}
      <MessageInput
        disabled={loading}
        sending={sending}
        uploading={uploading}
        onSend={onSend}
      />
    </div>
  );
}
