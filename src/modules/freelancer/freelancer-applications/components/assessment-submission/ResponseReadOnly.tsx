// src/modules/freelancer/freelancer-applications/components/assessment-submission/ResponseReadOnly.tsx
"use client";

import React from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssessmentTaskFreelancerDTO } from "@/modules/shared/assessment";
import type { AssessmentFieldValue } from "../../types/assessment";

interface Props {
  task: AssessmentTaskFreelancerDTO;
  value: AssessmentFieldValue | undefined;
}

function EmptyValue() {
  return <p className="text-sm italic text-muted-foreground">No response provided.</p>;
}

export function ResponseReadOnly({ task, value }: Props) {
  switch (task.task_type) {
    case "SINGLE_CHOICE": {
      const selected =
        value && value.task_type === "SINGLE_CHOICE" ? value.selected_choice_key : "";
      const label = task.choice_options.find((option) => option.key === selected)?.label;
      if (!label) return <EmptyValue />;
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
          {label}
        </div>
      );
    }
    case "TEXT_RESPONSE": {
      const text = value && value.task_type === "TEXT_RESPONSE" ? value.response_text.trim() : "";
      if (text === "") return <EmptyValue />;
      return (
        <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
          {text}
        </div>
      );
    }
    case "EXTERNAL_TASK": {
      const text = value && value.task_type === "EXTERNAL_TASK" ? value.response_text.trim() : "";
      return (
        <div className="space-y-3">
          {text === "" ? (
            <EmptyValue />
          ) : (
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
              {text}
            </div>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <a href={task.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open external task
            </a>
          </Button>
        </div>
      );
    }
    case "FILE_UPLOAD": {
      const proofId = value && value.task_type === "FILE_UPLOAD" ? value.proof_file_id : null;
      if (!proofId) return <EmptyValue />;
      const fileName = value && value.task_type === "FILE_UPLOAD" ? value.proof_file_name : null;
      return (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <a
            href={`/api/assets/${proofId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline"
          >
            {fileName ?? "Uploaded file"}
          </a>
          <span className="shrink-0 text-xs text-muted-foreground">Preview / download</span>
        </div>
      );
    }
    default: {
      const unreachable: never = task;
      throw new Error(`Unhandled assessment task type: ${JSON.stringify(unreachable)}`);
    }
  }
}
