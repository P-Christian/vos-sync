// src/modules/freelancer/freelancer-applications/components/assessment-submission/FileUploadTaskField.tsx
"use client";

import React from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const PROOF_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

interface Props {
  taskId: number;
  fileName: string | null;
  proofFileId: string | null;
  uploading: boolean;
  progress: number;
  disabled?: boolean;
  onUpload: (file: File) => void;
}

export function FileUploadTaskField({
  taskId,
  fileName,
  proofFileId,
  uploading,
  progress,
  disabled,
  onUpload,
}: Props) {
  const inputId = `assessment-proof-${taskId}`;
  const locked = uploading || disabled === true;
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onUpload(file);
  };
  return (
    <div className="space-y-2">
      {proofFileId && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <a
            href={`/api/assets/${proofFileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline"
          >
            {fileName ?? "Uploaded file"}
          </a>
          <span className="shrink-0 text-xs text-muted-foreground">Preview / download</span>
        </div>
      )}
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40",
          locked && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4" />
            {proofFileId ? "Replace file" : "Choose a file"}
          </>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept={PROOF_ACCEPT}
        className="sr-only"
        disabled={locked}
        onChange={handleChange}
      />
      <p className="text-xs text-muted-foreground">PDF, JPEG, PNG or WebP · up to 10 MB.</p>
      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-right text-xs text-muted-foreground">{progress}%</p>
        </div>
      )}
    </div>
  );
}
