"use client";

// src/modules/freelancer/freelancer-messaging/components/MessageBubble.tsx

import React, { useState } from "react";
import { FileText, ImageIcon, CheckCheck, Download, Eye } from "lucide-react";
import { Message } from "../types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import SystemMessageRenderer from "@/modules/shared/messaging/components/SystemMessageRenderer";
import dynamic from "next/dynamic";
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

  const [previewDoc, setPreviewDoc] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);

  if (message_type === "SYSTEM") {
    return (
      <>
        {showDateDivider && dateLabel && (
          <DateDivider label={dateLabel} />
        )}
        <div className="flex justify-center my-3 px-4">
          <SystemMessageRenderer message={message} />
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
                    "rounded-2xl overflow-hidden shadow-sm border max-w-[220px] group relative",
                    isOwn
                      ? "border-emerald-500/30"
                      : "border-zinc-200 dark:border-zinc-700"
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
                      setPreviewDoc({
                        fileName: att.file_name,
                        fileUrl: att.file_path,
                      })
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
                  <div
                    className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      isOwn ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-700"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{att.file_name}</p>
                    {att.file_size && (
                      <p
                        className={cn(
                          "text-[10px]",
                          isOwn ? "text-emerald-200" : "text-zinc-400"
                        )}
                      >
                        {formatFileSize(att.file_size)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDoc({
                          fileName: att.file_name,
                          fileUrl: att.file_path,
                        })
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

          {/* Meta */}
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
              <CheckCheck className="h-3 w-3 text-emerald-400 shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Attachment Document Preview Modal */}
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
              <DocumentViewer
                fileUrl={previewDoc.fileUrl}
                fileName={previewDoc.fileName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
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
