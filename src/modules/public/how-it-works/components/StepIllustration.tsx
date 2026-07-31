// src/modules/public/how-it-works/components/StepIllustration.tsx
"use client";

import React from "react";
import Image from "next/image";
import { RoleKey } from "../types";

interface Props {
  src: string;
  alt: string;
  roleKey: RoleKey;
  stepNumber: number;
}

export function StepIllustration({ src, alt, roleKey, stepNumber }: Props) {
  const themeMap: Record<RoleKey, string> = {
    employee:
      "from-blue-50/80 to-indigo-100/50 border-blue-200 dark:from-blue-950/20 dark:to-indigo-900/20 dark:border-blue-800",
    employer:
      "from-emerald-50/80 to-teal-100/50 border-emerald-200 dark:from-emerald-950/20 dark:to-teal-900/20 dark:border-emerald-800",
    school:
      "from-amber-50/80 to-orange-100/50 border-amber-200 dark:from-amber-950/20 dark:to-orange-900/20 dark:border-amber-800",
  };

  return (
    <div
      className={`
        relative
        w-full
        aspect-[4/3]
        max-h-80
        overflow-hidden
        rounded-3xl
        border
        bg-gradient-to-br
        ${themeMap[roleKey]}
        p-6
        flex
        items-center
        justify-center
        shadow-inner
        group
      `}
    >
      <div className="relative w-full h-full">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Subtle Step Badge Indicator */}
      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-xs px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest shadow-2xs">
        STEP 0{stepNumber}
      </div>
    </div>
  );
}
