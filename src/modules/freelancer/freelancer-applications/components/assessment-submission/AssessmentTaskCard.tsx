// src/modules/freelancer/freelancer-applications/components/assessment-submission/AssessmentTaskCard.tsx
"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssessmentFieldValue, AssessmentTaskView } from "../../types/assessment";
import { ExternalTaskField } from "./ExternalTaskField";
import { FileUploadTaskField } from "./FileUploadTaskField";
import { ResponseReadOnly } from "./ResponseReadOnly";
import { SingleChoiceTaskField } from "./SingleChoiceTaskField";
import { TextResponseTaskField } from "./TextResponseTaskField";

interface Props {
  index: number;
  task: AssessmentTaskView;
  editable: boolean;
  value: AssessmentFieldValue | undefined;
  issue?: string;
  uploading: boolean;
  uploadProgress: number;
  onChange: (value: AssessmentFieldValue) => void;
  onUpload: (file: File) => void;
}

export function AssessmentTaskCard({
  index,
  task,
  editable,
  value,
  issue,
  uploading,
  uploadProgress,
  onChange,
  onUpload,
}: Props) {
  const definition = task.task;

  const renderField = () => {
    switch (definition.task_type) {
      case "SINGLE_CHOICE":
        return (
          <SingleChoiceTaskField
            taskId={task.job_task_id}
            options={definition.choice_options}
            value={value && value.task_type === "SINGLE_CHOICE" ? value.selected_choice_key : ""}
            disabled={uploading}
            onChange={(selectedChoiceKey) =>
              onChange({ task_type: "SINGLE_CHOICE", selected_choice_key: selectedChoiceKey })
            }
          />
        );
      case "TEXT_RESPONSE":
        return (
          <TextResponseTaskField
            taskId={task.job_task_id}
            value={value && value.task_type === "TEXT_RESPONSE" ? value.response_text : ""}
            maxLength={definition.text_max_length}
            disabled={uploading}
            onChange={(responseText) =>
              onChange({ task_type: "TEXT_RESPONSE", response_text: responseText })
            }
          />
        );
      case "EXTERNAL_TASK":
        return (
          <ExternalTaskField
            taskId={task.job_task_id}
            url={definition.external_url}
            value={value && value.task_type === "EXTERNAL_TASK" ? value.response_text : ""}
            disabled={uploading}
            onChange={(responseText) =>
              onChange({ task_type: "EXTERNAL_TASK", response_text: responseText })
            }
          />
        );
      case "FILE_UPLOAD": {
        const proof = value && value.task_type === "FILE_UPLOAD" ? value : null;
        return (
          <FileUploadTaskField
            taskId={task.job_task_id}
            fileName={proof?.proof_file_name ?? null}
            proofFileId={proof?.proof_file_id ?? null}
            uploading={uploading}
            progress={uploadProgress}
            onUpload={onUpload}
          />
        );
      }
      default: {
        const unreachable: never = definition;
        throw new Error(`Unhandled assessment task type: ${JSON.stringify(unreachable)}`);
      }
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-4",
        issue ? "border-destructive/50 bg-destructive/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Task {index + 1}
          </p>
          <h4 className="mt-0.5 text-sm font-semibold text-foreground">{definition.title}</h4>
        </div>
        <Badge
          variant={definition.is_required ? "secondary" : "outline"}
          className="shrink-0 text-[10px]"
        >
          {definition.is_required ? "Required" : "Optional"}
        </Badge>
      </div>
      {definition.instructions && (
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
          {definition.instructions}
        </p>
      )}
      {editable ? renderField() : <ResponseReadOnly task={definition} value={value} />}
      {issue && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{issue}</span>
        </p>
      )}
    </div>
  );
}
