// src/modules/client/dashboard/components/AnimatedNumber.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
}

const fmt = new Intl.NumberFormat("en-US");

/**
 * Counts up to `value` (and from the previous value when it changes).
 * Writes straight to the DOM node, so it never re-renders React per frame.
 * Respects prefers-reduced-motion (shows the final number immediately).
 */
export default function AnimatedNumber({ value, className, duration = 0.9 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt.format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = fmt.format(Math.round(v));
      },
      onComplete: () => {
        prev.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {fmt.format(value)}
    </span>
  );
}
