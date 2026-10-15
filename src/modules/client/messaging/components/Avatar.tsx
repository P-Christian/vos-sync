"use client";

// src/modules/client/messaging/components/Avatar.tsx

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getInitials } from "../utils";

interface Props {
  name: string;
  src?: string | null;
  /** Pixel size (width and height) */
  size?: number;
  className?: string;
}

export default function Avatar({ name, src, size = 40, className }: Props) {
  // Remember which URL failed, so a new URL for the same person is retried automatically.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  const dimensions = { width: size, height: size };

  if (showImage) {
    return (
      <Image
        src={src}
        alt={name}
        width={size * 2}
        height={size * 2}
        unoptimized
        onError={() => setFailedSrc(src)}
        style={dimensions}
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900",
          className
        )}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{ ...dimensions, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ring-2 ring-white dark:ring-zinc-900",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
