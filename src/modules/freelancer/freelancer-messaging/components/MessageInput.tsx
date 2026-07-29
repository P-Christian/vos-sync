"use client";

// src/modules/freelancer/freelancer-messaging/components/MessageInput.tsx

import React, { useRef, useState, KeyboardEvent, useEffect } from "react";
import { Send, Paperclip, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface PendingFile {
  file: File;
  preview?: string;
}

interface Props {
  disabled?: boolean;
  sending?: boolean;
  uploading?: boolean;
  onSend: (content: string, files: File[]) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageInput({
  disabled,
  sending,
  uploading,
  onSend,
}: Props) {
  const [content, setContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = sending || uploading || disabled;
  const canSend = (content.trim().length > 0 || pendingFiles.length > 0) && !isBusy;

  useEffect(() => {
    return () => {
      pendingFiles.forEach((pf) => {
        if (pf.preview) URL.revokeObjectURL(pf.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPending: PendingFile[] = files.map((file) => {
      const pf: PendingFile = { file };
      if (file.type.startsWith("image/")) {
        pf.preview = URL.createObjectURL(file);
      }
      return pf;
    });
    setPendingFiles((prev) => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    if (isBusy) return;
    setPendingFiles((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
      next.splice(index, 1);
      return next;
    });
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(content.trim(), pendingFiles.map((pf) => pf.file));
    setContent("");
    pendingFiles.forEach((pf) => {
      if (pf.preview) URL.revokeObjectURL(pf.preview);
    });
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  };

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shrink-0 font-sans">
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 px-1">
          {pendingFiles.map((pf, i) => {
            const Icon = getFileIcon(pf.file.type);
            return (
              <div
                key={i}
                className={cn(
                  "relative flex items-center gap-2 pl-2.5 pr-8 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 max-w-[200px]",
                  isBusy && "opacity-60 grayscale-[0.5]"
                )}
              >
                {pf.preview ? (
                  <Image
                    width={64}
                    height={64}
                    src={pf.preview}
                    alt={pf.file.name}
                    className="h-8 w-8 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {pf.file.name}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {formatFileSize(pf.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={isBusy}
                  className="absolute right-1.5 top-1.5 p-0.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modern Capsule Input Row */}
      <div className="flex items-center gap-3">
        {/* Input Bar */}
        <div className="flex-1 relative flex items-center rounded-full bg-slate-50/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 px-5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all shadow-2xs">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            placeholder="Type here..."
            className="flex-1 bg-transparent border-0 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none overflow-y-auto leading-relaxed py-1.5 pr-2 disabled:opacity-50"
            style={{ minHeight: "36px", maxHeight: "100px" }}
          />

          {/* Inline Attachment Icon */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            title="Attach file"
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition shrink-0 disabled:opacity-40"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Separate Circular Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all shrink-0",
            canSend
              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-95 cursor-pointer shadow-xs"
              : "bg-slate-100 dark:bg-zinc-800/60 text-slate-300 dark:text-zinc-600 cursor-not-allowed"
          )}
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          ) : (
            <Send className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-0.5" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
