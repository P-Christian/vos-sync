"use client";

// src/modules/freelancer/freelancer-messaging/components/MessageBubble.tsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FileText, ImageIcon, CheckCheck, Download, Eye, Smile } from "lucide-react";
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

const DocumentViewer = dynamic(
  () => import("@/components/DocumentViewer").then((mod) => mod.DocumentViewer),
  { ssr: false }
);

interface Props {
  message: Message;
  isOwn: boolean;
  showDateDivider?: boolean;
  dateLabel?: string;
  onToggleReaction?: (messageId: number, reaction: string) => void;
}

// ─── AnimatedEmoji — single-responsibility, reused in picker + badge pill ────

function AnimatedEmoji({
  emoji,
  isAnimating,
}: {
  emoji: string;
  isAnimating: boolean;
}) {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const cleanStr = String(dateStr).replace("T", " ").replace("Z", "").trim();
  const [datePart = "", timePart = "00:00:00"] = cleanStr.split(" ");
  const [year = 1970, month = 1, day = 1] = datePart
    .split("-")
    .map((n) => parseInt(n, 10) || 0);
  const timeClean = timePart.split(".")[0] || "00:00:00";
  const [hour = 0, minute = 0, second = 0] = timeClean
    .split(":")
    .map((n) => parseInt(n, 10) || 0);
  return new Date(year, (month || 1) - 1, day || 1, hour, minute, second);
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const messageDate = parseDate(dateStr);
  if (isNaN(messageDate.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mDate = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );

  const diffDays = Math.round(
    (today.getTime() - mDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const rawHour = messageDate.getHours();
  const minute = messageDate.getMinutes();
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  const timeFormatted = `${hour}:${minute.toString().padStart(2, "0")} ${period}`;

  // If today: only show time
  if (diffDays === 0) {
    return timeFormatted;
  }

  // If yesterday: "Yesterday, 4:17 PM"
  if (diffDays === 1) {
    return `Yesterday, ${timeFormatted}`;
  }

  // If previous date: "Aug 14, 4:17 PM"
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthStr = monthNames[messageDate.getMonth()] ?? "";
  const day = messageDate.getDate();

  if (messageDate.getFullYear() === now.getFullYear()) {
    return `${monthStr} ${day}, ${timeFormatted}`;
  }

  return `${monthStr} ${day}, ${messageDate.getFullYear()}, ${timeFormatted}`;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(mimeType: string | null | undefined): boolean {
  return !!mimeType?.startsWith("image/");
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2 select-none pointer-events-none">
      <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-800" />
      <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-wide">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-800" />
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

export default function MessageBubble({
  message,
  isOwn,
  showDateDivider,
  dateLabel,
  onToggleReaction,
}: Props) {
  const { message_type, message_content, created_at, attachments, is_edited, reactions } =
    message;

  const [previewDoc, setPreviewDoc] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);

  const [showPicker, setShowPicker] = useState(false);

  // Tracks which emoji this user just clicked — cleared after 350 ms
  const [animatingReaction, setAnimatingReaction] = useState<string | null>(null);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const myReaction = reactions?.find((r) => r.reacted_by_me)?.reaction;
  const hasReactions = !!(reactions && reactions.length > 0);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  // Close picker when clicking outside the bubble or picker
  useEffect(() => {
    if (!showPicker) return;
    const handleOutsideClick = (e: PointerEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [showPicker]);

  // ─── Unified reaction handler ────────────────────────────────────────────

  const handleReact = useCallback(
    (emoji: string) => {
      // Trigger animation only on the emoji this user just clicked
      setAnimatingReaction(emoji);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setAnimatingReaction(null), 350);

      onToggleReaction?.(message.message_id, emoji);
      setShowPicker(false);
    },
    [message.message_id, onToggleReaction]
  );

  // ─── 3s Hold to open picker ───────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Prevent browser text-selection / scroll from cancelling the hold
    e.preventDefault();
    holdTimerRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 3000);
  };

  const handlePointerUp = () => {
    // Releasing does NOT close the picker — only click-outside does
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
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
        <div className="flex justify-center my-3 px-4">
          <SystemMessageRenderer message={message} />
        </div>
      </motion.div>
    );
  }

  // ─── Regular message ──────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="relative select-none"
    >
      {showDateDivider && dateLabel && <DateDivider label={dateLabel} />}

      <div
        className={cn(
          "group relative flex items-end gap-2",
          hasReactions ? "mb-3.5" : "mb-1.5",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* ── Reaction trigger button (left for own messages) ── */}
        {isOwn && (
          <div
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center mb-4 z-10 shrink-0",
              showPicker && "opacity-100"
            )}
          >
            <button
              type="button"
              title="Add reaction"
              onClick={() => setShowPicker((prev) => !prev)}
              className="p-1.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:scale-110 transition active:scale-95 cursor-pointer"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Bubble column ─────────────────────────────────────────────── */}
        <div
          className={cn(
            "relative max-w-[75%] flex flex-col gap-1",
            isOwn ? "items-end" : "items-start"
          )}
          ref={bubbleRef}
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* ── Floating Reaction Picker ────────────────────────────────── */}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                ref={pickerRef}
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "absolute -top-12 z-40 flex items-center gap-1 p-1.5 min-w-max",
                  "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md",
                  "border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl",
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
                      data-emoji={emoji}
                      onClick={() => handleReact(emoji)}
                      className={cn(
                        "relative h-8 w-8 flex items-center justify-center rounded-xl text-lg",
                        "transition-colors duration-150 cursor-pointer",
                        isSelected
                          ? "bg-emerald-100/90 dark:bg-emerald-950/90 border border-emerald-400/80 dark:border-emerald-600/80 scale-110 shadow-xs"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-110"
                      )}
                    >
                      {/* AnimatedEmoji fires when picker button is the clicked one */}
                      <AnimatedEmoji
                        emoji={emoji}
                        isAnimating={animatingReaction === emoji}
                      />
                      {isSelected && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Content area ────────────────────────────────────────────── */}
          <div className="relative group/content">
            {/* Text bubble */}
            {message_content && (
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs cursor-default select-text",
                  isOwn
                    ? "bg-emerald-600 text-white rounded-br-md"
                    : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 rounded-bl-md"
                )}
              >
                {message_content}
              </div>
            )}

            {/* Attachments */}
            {attachments?.map((att) => (
              <div key={att.attachment_id}>
                {isImageType(att.mime_type) ? (
                  <div
                    className={cn(
                      "rounded-2xl overflow-hidden shadow-sm border max-w-[220px]",
                      isOwn ? "border-emerald-500/30" : "border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    <Image
                      width={220}
                      height={192}
                      unoptimized
                      src={att.file_path}
                      alt={att.file_name}
                      className="w-full h-auto max-h-48 object-cover cursor-pointer"
                      onClick={() =>
                        setPreviewDoc({ fileName: att.file_name, fileUrl: att.file_path })
                      }
                    />
                    {att.file_name && (
                      <div
                        className={cn(
                          "px-3 py-1.5 text-[10px] flex items-center justify-between gap-1",
                          isOwn
                            ? "bg-emerald-600 text-emerald-100"
                            : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500"
                        )}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <ImageIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{att.file_name}</span>
                        </div>
                        <a
                          href={att.file_path}
                          download={att.file_name}
                          title="Download Image"
                          className="hover:opacity-80 p-0.5"
                        >
                          <Download className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-sm max-w-[240px]",
                      isOwn
                        ? "bg-emerald-500 border-emerald-400/40 text-white rounded-br-md"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-bl-md"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0", isOwn ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-700")}>
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{att.file_name}</p>
                      {att.file_size && (
                        <p className={cn("text-[10px]", isOwn ? "text-emerald-200" : "text-zinc-400")}>
                          {formatFileSize(att.file_size)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({ fileName: att.file_name, fileUrl: att.file_path })
                        }
                        title="Preview Document"
                        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={att.file_path}
                        download={att.file_name}
                        title="Download Document"
                        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* ── Reaction Pill Badge (bottom-right, overlapping) ─────── */}
            <AnimatePresence>
              {hasReactions && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0, y: 4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.6, opacity: 0, y: 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="absolute -bottom-2.5 right-2 z-20 flex items-center gap-0.5 backdrop-blur-xs shadow-xs rounded-full"
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
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                          "border transition-colors duration-150 cursor-pointer active:scale-95",
                          r.reacted_by_me
                            ? "bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-400"
                            : "bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                        )}
                      >
                        {/* AnimatedEmoji fires only for the emoji this user just clicked */}
                        <AnimatedEmoji
                          emoji={r.reaction}
                          isAnimating={animatingReaction === r.reaction}
                        />
                        <span className="font-medium leading-none">{r.count}</span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Timestamp ─────────────────────────────────────────────── */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-1",
              hasReactions ? "mt-2.5" : "mt-0",
              isOwn ? "flex-row-reverse" : "flex-row"
            )}
          >
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {formatTime(created_at)}
            </span>
            {is_edited && <span className="text-[10px] text-zinc-400 italic">edited</span>}
            {isOwn && <CheckCheck className="h-3 w-3 text-emerald-400 shrink-0" />}
          </div>
        </div>

        {/* ── Reaction trigger button (right for other messages) ── */}
        {!isOwn && (
          <div
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center mb-4 z-10 shrink-0",
              showPicker && "opacity-100"
            )}
          >
            <button
              type="button"
              title="Add reaction"
              onClick={() => setShowPicker((prev) => !prev)}
              className="p-1.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:scale-110 transition active:scale-95 cursor-pointer"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Document Preview Modal ─────────────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-3.5 border-b shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 pr-4">
              <FileText className="h-4 w-4 text-[#14a800] shrink-0" />
              <DialogTitle className="text-sm font-bold truncate">
                {previewDoc?.fileName}
              </DialogTitle>
            </div>
            {previewDoc && (
              <a
                href={previewDoc.fileUrl}
                download={previewDoc.fileName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14a800] hover:bg-[#118f00] text-white text-xs font-semibold shrink-0 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            )}
          </DialogHeader>
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 overflow-hidden relative">
            {previewDoc && (
              <DocumentViewer fileUrl={previewDoc.fileUrl} fileName={previewDoc.fileName} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
