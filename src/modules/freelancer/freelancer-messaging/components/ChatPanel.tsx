"use client";

// src/modules/freelancer/freelancer-messaging/components/ChatPanel.tsx

import React, { useEffect, useRef, useCallback } from "react";
import {
  RefreshCw,
  Briefcase,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ChevronUp,
  ArrowDown,
} from "lucide-react";
import { Conversation, Message } from "../types";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  conversation: Conversation;
  messages: Message[];
  currentUserId: number;
  loading: boolean;
  loadingOlder?: boolean;
  hasMore?: boolean;
  sending: boolean;
  uploading: boolean;
  error: string;
  onSend: (content: string, files: File[]) => void;
  onRefresh: () => void;
  onLoadOlder?: () => void;
  onBack?: () => void;
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const [datePart = "", timePart = "00:00:00"] = dateStr.replace("T", " ").split(" ");
  const [year = 1970, month = 1, day = 1] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function getDateLabel(dateStr: string): string {
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round(
    (nStart.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function isSameDayStr(a: string, b: string): boolean {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

function filterLatestInterviewCards(msgs: Message[]): Message[] {
  let latestRescheduledMsgId: number | null = null;

  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (
      m.message_type === "SYSTEM" &&
      m.system_message?.event_type === "INTERVIEW_UPDATED"
    ) {
      if (latestRescheduledMsgId === null || m.message_id > latestRescheduledMsgId) {
        latestRescheduledMsgId = m.message_id;
      }
    }
  }

  return msgs.filter((m) => {
    if (
      m.message_type === "SYSTEM" &&
      m.system_message?.event_type === "INTERVIEW_UPDATED"
    ) {
      return m.message_id === latestRescheduledMsgId;
    }
    return true;
  });
}

export default function ChatPanel({
  conversation,
  messages,
  currentUserId,
  loading,
  loadingOlder,
  hasMore,
  sending,
  uploading,
  error,
  onSend,
  onRefresh,
  onLoadOlder,
  onBack,
}: Props) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);

  const displayMessages = React.useMemo(
    () => filterLatestInterviewCards(messages),
    [messages]
  );

  const {
    other_party_name = "Employer",
    other_party_avatar,
    other_party_email,
    job_title,
    conversation_type,
  } = conversation;

  const [imgError, setImgError] = React.useState(false);
  const [prevAvatar, setPrevAvatar] = React.useState(other_party_avatar);

  if (other_party_avatar !== prevAvatar) {
    setPrevAvatar(other_party_avatar);
    setImgError(false);
  }

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isFarFromBottom);
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const prevMessagesLengthRef = useRef(messages.length);
  const prevConversationIdRef = useRef(conversation.conversation_id);
  const wasLoadingOlderRef = useRef(loadingOlder);

  useEffect(() => {
    const isNewConversation = prevConversationIdRef.current !== conversation.conversation_id;
    const isNewMessageAdded = messages.length > prevMessagesLengthRef.current;
    const justFinishedLoadingOlder = wasLoadingOlderRef.current && !loadingOlder;

    prevConversationIdRef.current = conversation.conversation_id;
    prevMessagesLengthRef.current = messages.length;
    wasLoadingOlderRef.current = loadingOlder;

    if (loading) return;

    if (isNewConversation) {
      scrollToBottom(false);
      const t1 = setTimeout(() => scrollToBottom(false), 50);
      const t2 = setTimeout(() => scrollToBottom(false), 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (isNewMessageAdded && !justFinishedLoadingOlder) {
      scrollToBottom(true);
      const t1 = setTimeout(() => scrollToBottom(true), 50);
      const t2 = setTimeout(() => scrollToBottom(true), 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [conversation.conversation_id, messages.length, loading, loadingOlder, scrollToBottom]);

  return (
    <motion.div
      key={conversation.conversation_id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="relative flex flex-col h-full"
    >
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
          <Image
            src={other_party_avatar}
            alt={other_party_name}
            width={50}
            height={50}
            unoptimized
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
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
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
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 bg-zinc-50/50 dark:bg-zinc-950/20"
      >
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
          <motion.div
            key={messages.length > 0 ? messages[0].message_id : "empty"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col justify-start space-y-2 min-h-full"
          >
            {/* Load Older Messages Trigger */}
            {hasMore && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={onLoadOlder}
                  disabled={loadingOlder}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition disabled:opacity-50"
                >
                  {loadingOlder ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                      <span>Loading older messages...</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Load older messages</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {displayMessages.map((msg, index) => {
              const isOwn = msg.sender_id === currentUserId;
              const prevMsg = displayMessages[index - 1];
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
          </motion.div>
        )}
      </div>

      {/* Floating Jump to Bottom Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => scrollToBottom(true)}
            title="Jump to recent messages"
            className="absolute right-6 bottom-20 z-20 p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}
