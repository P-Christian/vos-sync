"use client";

import React, { useEffect, useRef } from "react";
import { Bold, List, ListOrdered } from "lucide-react";

interface RichTextEditorProps {
  id: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  error,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Convert legacy markdown **bold** or newlines to HTML for visual editor display
  const formatToHtml = (val: string | null | undefined): string => {
    if (!val) return "";
    let html = val;
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      html = html.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      const lines = html.split("\n");
      const isList = lines.length > 1 && lines.some((l) => /^[-*•]\s/.test(l.trim()));
      if (isList) {
        html = `<ul>${lines.map((l) => `<li>${l.replace(/^[-*•]\s/, "")}</li>`).join("")}</ul>`;
      } else {
        html = lines.join("<br>");
      }
    }
    return html;
  };

  useEffect(() => {
    if (editorRef.current) {
      const targetHtml = formatToHtml(value);
      const currentHtml = editorRef.current.innerHTML;
      if (!currentHtml && targetHtml) {
        editorRef.current.innerHTML = targetHtml;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, arg?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    // Bold: Ctrl+B
    if (isCtrlOrCmd && !e.shiftKey && key === "b") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      exec("bold");
      return;
    }

    // Bullet List: Ctrl+Shift+8 or Ctrl+Shift+L
    if (isCtrlOrCmd && e.shiftKey && (key === "8" || key === "*" || key === "l")) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      exec("insertUnorderedList");
      return;
    }

    // Numbered List: Ctrl+Shift+7 or Ctrl+Shift+O
    if (isCtrlOrCmd && e.shiftKey && (key === "7" || key === "&" || key === "o")) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      exec("insertOrderedList");
      return;
    }

    // Auto-convert to list when typing "- " or "1. " followed by Space
    if (e.key === " ") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || "";
          const textBeforeCursor = text.substring(0, range.startOffset);
          if (textBeforeCursor === "-" || textBeforeCursor === "*" || textBeforeCursor === "•") {
            e.preventDefault();
            node.textContent = text.substring(range.startOffset);
            exec("insertUnorderedList");
            return;
          }
          if (textBeforeCursor === "1.") {
            e.preventDefault();
            node.textContent = text.substring(range.startOffset);
            exec("insertOrderedList");
            return;
          }
        }
      }
    }
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-white dark:bg-zinc-950 transition-colors ${
        error
          ? "border-rose-500 focus-within:ring-rose-500"
          : "border-zinc-200 dark:border-zinc-800 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50">
        <span className="text-[11px] text-zinc-400 font-medium select-none">
          Shortcuts: Ctrl+B (Bold) | Ctrl+Shift+8 (Bullet) | Ctrl+Shift+7 (Numbered)
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("bold");
            }}
            title="Bold (Ctrl+B)"
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 font-bold transition-colors"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("insertUnorderedList");
            }}
            title="Bullet List (Ctrl+Shift+8 or type '- ' + Space)"
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("insertOrderedList");
            }}
            title="Numbered List (Ctrl+Shift+7 or type '1. ' + Space)"
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className="min-h-[140px] max-h-[300px] p-3 text-sm leading-relaxed outline-none focus:outline-none overflow-y-auto text-zinc-800 dark:text-zinc-200 empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_b]:font-bold [&_strong]:font-bold"
      />
    </div>
  );
}
