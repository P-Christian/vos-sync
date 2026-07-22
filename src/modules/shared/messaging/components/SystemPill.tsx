"use client";

// src/modules/shared/messaging/components/SystemPill.tsx

import React from "react";
import { Info } from "lucide-react";

interface Props {
  text?: string | null;
}

/** Permanent fallback pill for unknown or legacy SYSTEM messages. Never remove. */
export default function SystemPill({ text }: Props) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
      <Info className="h-3 w-3 text-zinc-400 shrink-0" />
      <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
        {text ?? "System event"}
      </span>
    </div>
  );
}
