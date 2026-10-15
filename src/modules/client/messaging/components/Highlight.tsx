"use client";

// src/modules/client/messaging/components/Highlight.tsx

import React from "react";
import { escapeRegExp } from "../utils";

interface Props {
  text: string;
  query?: string;
}

export default function Highlight({ text, query }: Props) {
  const q = query?.trim();
  if (!q) return <>{text}</>;

  // With one capture group, odd indexes are the matches.
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm bg-amber-200 px-0.5 text-zinc-900 dark:bg-amber-300"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
