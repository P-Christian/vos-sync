"use client";

// src/modules/client/messaging/components/MessageBubble.tsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FileText, ImageIcon, Check, Download, Eye, Smile, Copy } from "lucide-react";
import { Message, ALLOWED_REACTIONS } from "../types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import SystemMessageRenderer from "@/modules/shared/messaging/components/SystemMessageRenderer";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Avatar from "./Avatar";
import Highlight from "./Highlight";
import { formatFileSize, formatFullDateTime, formatMessageTime } from "../utils";

const DocumentViewer = dynamic(
  () => import("@/components/DocumentViewer").then((mod) => mod.DocumentViewer),
  { ssr: false }
);

interface Props {
  message: Message;
  isOwn: boolean;
  showDateDivider?: boolean;
  dateLabel?: string;
  /** Consecutive messages from the same sender within 5 min are grouped */
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  otherParty?: { name: string; avatar?: string | null };
  searchQuery?: string;
  isActiveMatch?: boolean;
  onToggleReaction?: (messageId: number, reaction: string) => void;
}

const LONG_PRESS_MS = 450;
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

// ─── Small pieces ─────────────────────────────────────────────────────────────

function AnimatedEmoji({ emoji, isAnimating }: { emoji: string; isAnimating: boolean }) {
  return (
    <motion.span
      animate={
        isAnimating
          ? { scale: [1, 1.45, 0.88, 1], rotate: [0, -14, 10, 0] }
          : { scale: 1, rotate: 0 }
      }
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block select-none leading-none"
    >
      {emoji}
    </motion.span>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="pointer-events-none my-4 flex select-none items-center gap-3 px-2">
      <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {label}
      </span>
      <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
    </div>
  );
}

/** Turns URLs into links and highlights the in-chat search term in the rest. */
function MessageText({ text, query, isOwn }: { text: string; query?: string; isOwn: boolean }) {
  const parts = text.split(URL_RE); // one capture group → odd indexes are URLs
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "break-all underline underline-offset-2",
              isOwn
                ? "text-white hover:text-indigo-100"
                : "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            )}
          >
            {part}
          </a>
        ) : (
          <Highlight key={i} text={part} query={query} />
        )
      )}
    </>
  );
}

const isImageType = (mime: string | null | undefined) => !!mime?.startsWith("image/");

// ─── MessageBubble ────────────────────────────────────────────────────────────

export default function MessageBubble({
  message,
  isOwn,
  showDateDivider,
  dateLabel,
  isFirstInGroup = true,
  isLastInGroup = true,
  otherParty,
  searchQuery,
  isActiveMatch,
  onToggleReaction,
}: Props) {
  const { message_type, message_content, created_at, attachments, is_edited, reactions } = message;

  const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [animatingReaction, setAnimatingReaction] = useState<string | null>(null);

  const pressRef = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const myReaction = reactions?.find((r) => r.reacted_by_me)?.reaction;
  const hasReactions = !!(reactions && reactions.length > 0);

  const cancelPress = useCallback(() => {
    if (pressRef.current) {
      clearTimeout(pressRef.current.timer);
      pressRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelPress();
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [cancelPress]);

  // Close the picker on outside tap / Escape
  useEffect(() => {
    if (!showPicker) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setShowPicker(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // tells the module-level Esc handler we've used it
        setShowPicker(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [showPicker]);

  const handleReact = useCallback(
    (emoji: string) => {
      onToggleReaction?.(message.message_id, emoji);
      setAnimatingReaction(emoji);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setAnimatingReaction(null), 350);
      setShowPicker(false);
    },
    [message.message_id, onToggleReaction]
  );

  const handleCopy = useCallback(async () => {
    if (!message_content) return;
    try {
      await navigator.clipboard.writeText(message_content);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; fail quietly */
    }
    setShowPicker(false);
  }, [message_content]);

  // ─── Touch long-press (400ms) opens the picker. Mouse users use the hover button.
  // No preventDefault / touch-action:none, so scrolling the chat over a bubble still works.

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    cancelPress();
    pressRef.current = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        pressRef.current = null;
        setShowPicker(true);
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS),
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const press = pressRef.current;
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) cancelPress();
  };

  // ─── System message ───────────────────────────────────────────────────────

  if (message_type === "SYSTEM") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {showDateDivider && dateLabel && <DateDivider label={dateLabel} />}
        <div className="my-3 flex justify-center px-4">
          <SystemMessageRenderer message={message} />
        </div>
      </motion.div>
    );
  }

  // ─── Regular message ──────────────────────────────────────────────────────

  const radius = isOwn
    ? cn("rounded-2xl rounded-br-md", !isFirstInGroup && "rounded-tr-md")
    : cn("rounded-2xl rounded-bl-md", !isFirstInGroup && "rounded-tl-md");

  const actionButton =
    "flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:scale-110 hover:text-zinc-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:text-zinc-200";

  // Desktop-only hover actions
  const actions = (
    <div
      className={cn(
        "hidden items-center gap-1 self-center opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 md:flex",
        showPicker && "opacity-100"
      )}
    >
      <button
        type="button"
        title="Add reaction"
        aria-label="Add reaction"
        aria-expanded={showPicker}
        onClick={() => setShowPicker((prev) => !prev)}
        className={actionButton}
      >
        <Smile className="h-3.5 w-3.5" />
      </button>
      {message_content && (
        <button
          type="button"
          title={copied ? "Copied" : "Copy text"}
          aria-label="Copy message text"
          onClick={handleCopy}
          className={actionButton}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );

  return (
    <motion.div
      data-message-id={message.message_id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn("relative", isFirstInGroup && !showDateDivider ? "mt-3" : "mt-0.5")}
    >
      {showDateDivider && dateLabel && <DateDivider label={dateLabel} />}

      <div
        ref={rowRef}
        className={cn(
          "group relative flex items-start gap-2",
          hasReactions && "mb-3",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* Avatar slot (other party only; shown on first message of a group) */}
        {!isOwn && (
          <div className="w-7 shrink-0">
            {isFirstInGroup && otherParty && (
              <Avatar name={otherParty.name} src={otherParty.avatar} size={28} className="ring-0" />
            )}
          </div>
        )}

        {isOwn && actions}

        {/* Bubble column */}
        <div
          className={cn(
            "relative flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]",
            isOwn ? "items-end" : "items-start"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
        >
          {/* Reaction picker */}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "absolute -top-12 z-40 flex min-w-max items-center gap-1 p-1.5",
                  "rounded-2xl border border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95",
                  isOwn ? "right-0" : "left-0"
                )}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {ALLOWED_REACTIONS.map((emoji) => {
                  const isSelected = emoji === myReaction;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      role="menuitem"
                      aria-label={`React with ${emoji}`}
                      aria-pressed={isSelected}
                      onClick={() => handleReact(emoji)}
                      className={cn(
                        "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-lg transition-colors duration-150 max-md:size-10",
                        isSelected
                          ? "scale-110 border border-indigo-400/80 bg-indigo-100/90 dark:border-indigo-600/80 dark:bg-indigo-950/90"
                          : "hover:scale-110 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <AnimatedEmoji emoji={emoji} isAnimating={animatingReaction === emoji} />
                      {isSelected && (
                        <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  );
                })}

                {/* Copy lives here on touch screens, where text selection is off */}
                {message_content && (
                  <>
                    <span className="mx-0.5 h-5 w-px bg-zinc-200 md:hidden dark:bg-zinc-700" />
                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Copy message text"
                      onClick={handleCopy}
                      className="flex size-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div
            className={cn(
              "relative flex flex-col gap-1",
              isOwn ? "items-end" : "items-start",
              isActiveMatch && "rounded-2xl ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-zinc-950"
            )}
          >
            {message_content && (
              <div
                title={formatFullDateTime(created_at)}
                className={cn(
                  "cursor-default select-text whitespace-pre-wrap break-words px-3.5 py-2 text-sm leading-relaxed shadow-xs max-md:select-none",
                  radius,
                  isOwn
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-200/60 bg-white text-zinc-800 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-100"
                )}
              >
                <MessageText text={message_content} query={searchQuery} isOwn={isOwn} />
              </div>
            )}

            {attachments?.map((att) => (
              <div key={att.attachment_id}>
                {isImageType(att.mime_type) ? (
                  <div
                    className={cn(
                      "max-w-[220px] overflow-hidden rounded-2xl border shadow-sm",
                      isOwn ? "border-indigo-500/30" : "border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    <button
                      type="button"
                      aria-label={`Preview ${att.file_name}`}
                      onClick={() => setPreviewDoc({ fileName: att.file_name, fileUrl: att.file_path })}
                      className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                    >
                      <Image
                        width={220}
                        height={192}
                        unoptimized
                        src={att.file_path}
                        alt={att.file_name}
                        className="h-auto max-h-48 w-full cursor-pointer object-cover"
                      />
                    </button>
                    {att.file_name && (
                      <div
                        className={cn(
                          "flex items-center justify-between gap-1 px-3 py-1.5 text-xs",
                          isOwn
                            ? "bg-indigo-600 text-indigo-100"
                            : "bg-zinc-50 text-zinc-500 dark:bg-zinc-800"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          <ImageIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{att.file_name}</span>
                        </div>
                        <a
                          href={att.file_path}
                          download={att.file_name}
                          title="Download image"
                          aria-label={`Download ${att.file_name}`}
                          className="p-0.5 hover:opacity-80 max-md:flex max-md:size-10 max-md:items-center max-md:justify-center max-md:p-0"
                        >
                          <Download className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex max-w-[260px] items-center gap-2 border px-3 py-2 shadow-sm",
                      radius,
                      isOwn
                        ? "border-indigo-500/40 bg-indigo-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 rounded-lg p-1.5",
                        isOwn ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-700"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{att.file_name}</p>
                      {att.file_size ? (
                        <p className={cn("text-[11px]", isOwn ? "text-indigo-200" : "text-zinc-500")}>
                          {formatFileSize(att.file_size)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ fileName: att.file_name, fileUrl: att.file_path })}
                        title="Preview document"
                        aria-label={`Preview ${att.file_name}`}
                        className="rounded-md p-1 transition hover:bg-black/10 max-md:size-10 dark:hover:bg-white/10"
                      >
                        <Eye className="mx-auto h-3.5 w-3.5" />
                      </button>
                      <a
                        href={att.file_path}
                        download={att.file_name}
                        title="Download document"
                        aria-label={`Download ${att.file_name}`}
                        className="rounded-md p-1 transition hover:bg-black/10 max-md:flex max-md:size-10 max-md:items-center max-md:justify-center dark:hover:bg-white/10"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Reaction pills (overlapping the bottom edge) */}
            <AnimatePresence>
              {hasReactions && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0, y: 4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.6, opacity: 0, y: 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className={cn(
                    "absolute -bottom-2.5 z-20 flex items-center gap-0.5 rounded-full shadow-xs backdrop-blur-xs",
                    isOwn ? "right-2" : "left-2"
                  )}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {reactions!.map((r) => {
                    const tooltipText =
                      r.users && r.users.length > 0
                        ? r.users.map((u) => u.user_name).join(", ")
                        : `${r.count} reaction${r.count > 1 ? "s" : ""}`;

                    return (
                      <motion.button
                        layout
                        key={r.reaction}
                        type="button"
                        onClick={() => handleReact(r.reaction)}
                        title={tooltipText}
                        aria-label={`${r.reaction} ${r.count}${r.reacted_by_me ? ", you reacted" : ""}. Toggle reaction`}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors duration-150 active:scale-95 max-md:min-h-8",
                          r.reacted_by_me
                            ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
                        )}
                      >
                        <AnimatedEmoji emoji={r.reaction} isAnimating={animatingReaction === r.reaction} />
                        <span className="font-medium leading-none">{r.count}</span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timestamp: once per group */}
          {isLastInGroup && (
            <div
              className={cn(
                "flex items-center gap-1.5 px-1",
                hasReactions ? "mt-2.5" : "mt-0",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
            >
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatMessageTime(created_at)}</span>
              {is_edited && <span className="text-xs italic text-zinc-400">edited</span>}
              {/* Single check = sent. Swap for CheckCheck once the API exposes read receipts. */}
              {isOwn && <Check className="h-3 w-3 shrink-0 text-indigo-400" aria-label="Sent" />}
            </div>
          )}
        </div>

        {!isOwn && actions}
      </div>

      {/* Document preview */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 max-md:max-h-[90dvh] sm:max-w-4xl">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-3.5">
            <div className="flex min-w-0 items-center gap-2 pr-4">
              <FileText className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <DialogTitle className="truncate text-sm font-bold">{previewDoc?.fileName}</DialogTitle>
            </div>
            {previewDoc && (
              <a
                href={previewDoc.fileUrl}
                download={previewDoc.fileName}
                className="mr-5 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 max-md:min-h-10"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            )}
          </DialogHeader>
          <div className="relative flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
            {previewDoc && <DocumentViewer fileUrl={previewDoc.fileUrl} fileName={previewDoc.fileName} />}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}