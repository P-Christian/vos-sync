"use client";

// src/modules/client/messaging/components/MessageBubble.tsx

import React from "react";
import { FileText, ImageIcon, CheckCheck, Info } from "lucide-react";
import { Message } from "../types";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  message: Message;
  isOwn: boolean;
  showDateDivider?: boolean;
  dateLabel?: string;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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

export default function MessageBubble({
  message,
  isOwn,
  showDateDivider,
  dateLabel,
}: Props) {
  const { message_type, message_content, created_at, attachments, is_edited } =
    message;

  // ─── System message ────────────────────────────────────────────────────

  if (message_type === "SYSTEM") {
    return (
      <>
        {showDateDivider && dateLabel && (
          <DateDivider label={dateLabel} />
        )}
        <div className="flex justify-center my-3">
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <Info className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              {message_content}
            </span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showDateDivider && dateLabel && <DateDivider label={dateLabel} />}
      <div
        className={cn(
          "flex mb-1.5",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "max-w-[75%] flex flex-col gap-1",
            isOwn ? "items-end" : "items-start"
          )}
        >
          {/* Text content */}
          {message_content && (
            <div
              className={cn(
                "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                isOwn
                  ? "bg-indigo-600 text-white rounded-br-md"
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
                <a
                  href={att.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div
                    className={cn(
                      "rounded-2xl overflow-hidden shadow-sm border max-w-[220px]",
                      isOwn
                        ? "border-indigo-500/30"
                        : "border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    <Image
                    width={64}
                    height={64}
                      src={att.file_path}
                      alt={att.file_name}
                      className="w-full h-auto max-h-48 object-cover"
                    />
                    {att.file_name && (
                      <div
                        className={cn(
                          "px-3 py-1.5 text-[10px] flex items-center gap-1",
                          isOwn
                            ? "bg-indigo-600 text-indigo-100"
                            : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500"
                        )}
                      >
                        <ImageIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{att.file_name}</span>
                      </div>
                    )}
                  </div>
                </a>
              ) : (
                <a
                  href={att.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border shadow-sm transition-opacity hover:opacity-80 max-w-[220px]",
                    isOwn
                      ? "bg-indigo-500 border-indigo-400/40 text-white rounded-br-md"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-bl-md"
                  )}
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      isOwn
                        ? "bg-white/20"
                        : "bg-zinc-100 dark:bg-zinc-700"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{att.file_name}</p>
                    {att.file_size && (
                      <p
                        className={cn(
                          "text-[10px]",
                          isOwn
                            ? "text-indigo-200"
                            : "text-zinc-400"
                        )}
                      >
                        {formatFileSize(att.file_size)}
                      </p>
                    )}
                  </div>
                </a>
              )}
            </div>
          ))}

          {/* Meta: time + edited */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-1",
              isOwn ? "flex-row-reverse" : "flex-row"
            )}
          >
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {formatTime(created_at)}
            </span>
            {is_edited && (
              <span className="text-[10px] text-zinc-400 italic">edited</span>
            )}
            {isOwn && (
              <CheckCheck className="h-3 w-3 text-indigo-400 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
      <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}
