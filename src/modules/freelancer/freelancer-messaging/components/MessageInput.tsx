"use client";

// src/modules/freelancer/freelancer-messaging/components/MessageInput.tsx

import React, { useRef, useState, KeyboardEvent } from "react";
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
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 px-1">
          {pendingFiles.map((pf, i) => {
            const Icon = getFileIcon(pf.file.type);
            return (
              <div
                key={i}
                className="relative flex items-center gap-2 pl-2.5 pr-8 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 max-w-[200px]"
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
                  onClick={() => removeFile(i)}
                  className="absolute right-1.5 top-1.5 p-0.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          title="Attach file"
          className="flex-shrink-0 mb-0.5 p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition leading-relaxed disabled:opacity-50"
          style={{ minHeight: "42px", maxHeight: "120px" }}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex-shrink-0 mb-0.5 p-2.5 rounded-xl transition-all",
            canSend
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 active:scale-95"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
          )}
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
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
