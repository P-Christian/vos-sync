"use client";

// src/modules/client/messaging/components/EmptyState.tsx

import React from "react";
import { MessageSquareDashed } from "lucide-react";

interface Props {
  message?: string;
  subMessage?: string;
}

export default function EmptyState({
  message = "Select a conversation",
  subMessage = "Choose a conversation from the left to start chatting",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
        <div className="relative p-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900/50">
          <MessageSquareDashed className="h-12 w-12 text-indigo-400 dark:text-indigo-500" />
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
          {message}
        </h3>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-sm">
          {subMessage}
        </p>
      </div>
    </div>
  );
}
