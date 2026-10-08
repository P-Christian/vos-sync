// src/modules/client/pipeline/components/assessment-task-editor/SingleChoiceFields.tsx
// SINGLE_CHOICE field group: option key/label rows plus the correct-answer
// select. Rendered inside TaskForm.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { taskInputClass } from "./form-classes";
import type { OptionDraft } from "./task-form-state";

interface SingleChoiceFieldsProps {
  options: OptionDraft[];
  correctChoiceKey: string;
  fieldErrors: Record<string, string>;
  disabled: boolean;
  onOptionsChange: (options: OptionDraft[]) => void;
  onCorrectKeyChange: (key: string) => void;
}

export default function SingleChoiceFields({
  options,
  correctChoiceKey,
  fieldErrors,
  disabled,
  onOptionsChange,
  onCorrectKeyChange,
}: SingleChoiceFieldsProps) {
  const updateOption = (
    index: number,
    field: "key" | "label",
    value: string
  ) => {
    onOptionsChange(
      options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      )
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          Answer options <span className="text-rose-500">*</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onOptionsChange([...options, { key: "", label: "" }])
          }
          disabled={disabled || options.length >= 20}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3" /> Add option
        </Button>
      </div>
      {fieldErrors.options && (
        <p className="text-[11px] text-destructive">{fieldErrors.options}</p>
      )}
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="w-20 shrink-0 space-y-1">
              <Input
                value={option.key}
                onChange={(e) => updateOption(index, "key", e.target.value)}
                placeholder="Key"
                aria-label={`Option ${index + 1} key`}
                className={taskInputClass(
                  Boolean(fieldErrors[`option-key-${index}`])
                )}
                disabled={disabled}
              />
              {fieldErrors[`option-key-${index}`] && (
                <p className="text-[11px] text-destructive">
                  {fieldErrors[`option-key-${index}`]}
                </p>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                value={option.label}
                onChange={(e) =>
                  updateOption(index, "label", e.target.value)
                }
                placeholder={`Option ${index + 1} label`}
                aria-label={`Option ${index + 1} label`}
                className={taskInputClass(
                  Boolean(fieldErrors[`option-label-${index}`])
                )}
                disabled={disabled}
              />
              {fieldErrors[`option-label-${index}`] && (
                <p className="text-[11px] text-destructive">
                  {fieldErrors[`option-label-${index}`]}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onOptionsChange(options.filter((_, i) => i !== index))
              }
              disabled={disabled || options.length <= 2}
              className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              title="Remove option"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Correct answer <span className="text-rose-500">*</span>
        </Label>
        <Select
          value={correctChoiceKey}
          onValueChange={onCorrectKeyChange}
          disabled={disabled}
        >
          <SelectTrigger
            className={`h-9 text-xs ${fieldErrors.correct_choice_key ? "border-destructive" : ""}`}
          >
            <SelectValue placeholder="Select the correct option key" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option, index) => {
              const key = option.key.trim() || `Option ${index + 1}`;
              return (
                <SelectItem
                  key={`${index}-${key}`}
                  value={option.key.trim() || key}
                  className="text-xs"
                >
                  {key}
                  {option.label.trim() ? ` — ${option.label.trim()}` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {fieldErrors.correct_choice_key && (
          <p className="text-[11px] text-destructive">
            {fieldErrors.correct_choice_key}
          </p>
        )}
      </div>
    </div>
  );
}
