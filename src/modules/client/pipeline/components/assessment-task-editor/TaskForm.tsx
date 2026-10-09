// src/modules/client/pipeline/components/assessment-task-editor/TaskForm.tsx
// Create/edit form for one assessment task. Produces a shared
// CreateTaskInput; the caller converts to an update input for edits.

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { CompanyAssessmentTaskRow } from "../../services/assessment-task.service";
import type {
  AssessmentTaskType,
  CreateTaskInput,
} from "@/modules/shared/assessment";
import {
  blankFormState,
  formStateFromTask,
  type TaskFormState,
} from "./task-form-state";
import { validateTaskForm } from "./task-form-validation";
import { buildCreateInput } from "./task-submit";
import { taskInputClass } from "./form-classes";
import { TASK_TYPE_META, TASK_TYPE_ORDER } from "./types";
import SingleChoiceFields from "./SingleChoiceFields";

interface TaskFormProps {
  initial: CompanyAssessmentTaskRow | null;
  sortOrder: number;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTaskInput) => Promise<string | null>;
}

export default function TaskForm({
  initial,
  sortOrder,
  submitting,
  onCancel,
  onSubmit,
}: TaskFormProps) {
  const [form, setForm] = useState<TaskFormState>(() =>
    initial ? formStateFromTask(initial) : blankFormState()
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  const set = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (taskType: AssessmentTaskType) => {
    setForm((prev) => ({
      ...blankFormState(),
      task_type: taskType,
      title: prev.title,
      instructions: prev.instructions,
      is_required: prev.is_required,
    }));
    setFieldErrors({});
    setServerError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateTaskForm(form);
    setFieldErrors(errors);
    setServerError("");
    if (Object.keys(errors).length > 0) return;
    const failure = await onSubmit(buildCreateInput(form, sortOrder));
    if (failure) setServerError(failure);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3"
    >
      {serverError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Task type <span className="text-rose-500">*</span>
          </Label>
          <Select
            value={form.task_type}
            onValueChange={(value) =>
              handleTypeChange(value as AssessmentTaskType)
            }
            disabled={initial !== null || submitting}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPE_ORDER.map((taskType) => (
                <SelectItem key={taskType} value={taskType} className="text-xs">
                  {TASK_TYPE_META[taskType].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {TASK_TYPE_META[form.task_type].hint}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-required" className="text-xs font-medium">
            Candidate requirement
          </Label>
          <div className="flex h-9 items-center gap-2">
            <Switch
              id="task-required"
              checked={form.is_required}
              onCheckedChange={(checked) => set("is_required", checked)}
              disabled={submitting}
            />
            <span className="text-xs text-muted-foreground">
              {form.is_required
                ? "Required to complete the stage"
                : "Optional for candidates"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Title <span className="text-rose-500">*</span>
        </Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g., JavaScript fundamentals quiz"
          className={taskInputClass(Boolean(fieldErrors.title))}
          disabled={submitting}
        />
        {fieldErrors.title && (
          <p className="text-[11px] text-destructive">{fieldErrors.title}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Instructions <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          value={form.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          placeholder="What should the candidate do?"
          className={`text-xs resize-none ${fieldErrors.instructions ? "border-destructive" : ""}`}
          rows={2}
          disabled={submitting}
        />
        {fieldErrors.instructions && (
          <p className="text-[11px] text-destructive">
            {fieldErrors.instructions}
          </p>
        )}
      </div>

      {form.task_type === "SINGLE_CHOICE" && (
        <SingleChoiceFields
          options={form.options}
          correctChoiceKey={form.correct_choice_key}
          fieldErrors={fieldErrors}
          disabled={submitting}
          onOptionsChange={(options) => set("options", options)}
          onCorrectKeyChange={(key) => set("correct_choice_key", key)}
        />
      )}

      {form.task_type === "EXTERNAL_TASK" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            External URL <span className="text-rose-500">*</span>
          </Label>
          <Input
            value={form.external_url}
            onChange={(e) => set("external_url", e.target.value)}
            placeholder="https://example.com/coding-challenge"
            inputMode="url"
            className={taskInputClass(Boolean(fieldErrors.external_url))}
            disabled={submitting}
          />
          {fieldErrors.external_url ? (
            <p className="text-[11px] text-destructive">
              {fieldErrors.external_url}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Must be a public HTTPS link. The server never fetches it.
            </p>
          )}
        </div>
      )}

      {form.task_type === "TEXT_RESPONSE" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Maximum answer length (characters){" "}
            <span className="text-rose-500">*</span>
          </Label>
          <Input
            value={form.text_max_length}
            onChange={(e) => set("text_max_length", e.target.value)}
            placeholder="4000"
            inputMode="numeric"
            className={taskInputClass(Boolean(fieldErrors.text_max_length))}
            disabled={submitting}
          />
          {fieldErrors.text_max_length && (
            <p className="text-[11px] text-destructive">
              {fieldErrors.text_max_length}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
          className="h-8 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitting}
          className="h-8 text-xs"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
            </span>
          ) : initial ? (
            "Save changes"
          ) : (
            "Add task"
          )}
        </Button>
      </div>
    </form>
  );
}
