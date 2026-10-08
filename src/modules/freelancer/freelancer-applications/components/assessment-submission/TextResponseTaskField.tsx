// src/modules/freelancer/freelancer-applications/components/assessment-submission/TextResponseTaskField.tsx
"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  taskId: number;
  value: string;
  maxLength: number;
  disabled?: boolean;
  onChange: (responseText: string) => void;
}

export function TextResponseTaskField({ taskId, value, maxLength, disabled, onChange }: Props) {
  const atLimit = value.length >= maxLength;
  return (
    <div className="space-y-1.5">
      <Textarea
        id={`assessment-text-${taskId}`}
        value={value}
        maxLength={maxLength}
        rows={5}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type your response…"
        className="resize-y"
      />
      <p className={cn("text-right text-xs", atLimit ? "text-warning" : "text-muted-foreground")}>
        {value.length} / {maxLength} characters
      </p>
    </div>
  );
}
