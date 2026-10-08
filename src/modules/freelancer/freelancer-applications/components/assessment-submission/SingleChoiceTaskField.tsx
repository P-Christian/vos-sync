// src/modules/freelancer/freelancer-applications/components/assessment-submission/SingleChoiceTaskField.tsx
"use client";

import React from "react";
import type { AssessmentChoiceOption } from "@/modules/shared/assessment";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface Props {
  taskId: number;
  options: AssessmentChoiceOption[];
  value: string;
  disabled?: boolean;
  onChange: (selectedChoiceKey: string) => void;
}

export function SingleChoiceTaskField({ taskId, options, value, disabled, onChange }: Props) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="gap-2"
      aria-label="Choose one option"
    >
      {options.map((option) => {
        const optionId = `assessment-choice-${taskId}-${option.key}`;
        const selected = value === option.key;
        return (
          <label
            key={option.key}
            htmlFor={optionId}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
              selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <RadioGroupItem value={option.key} id={optionId} />
            <span className="text-sm text-foreground">{option.label}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
