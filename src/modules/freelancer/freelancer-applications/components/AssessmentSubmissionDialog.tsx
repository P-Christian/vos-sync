// src/modules/freelancer/freelancer-applications/components/AssessmentSubmissionDialog.tsx
"use client";

import React, { useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationItem } from "../types";
import { useFreelancerAssessment } from "../hooks/useFreelancerAssessment";
import { isEditableStatus } from "../services/assessment-form";
import { AssessmentStatusBanner } from "./assessment-submission/AssessmentStatusBanner";
import { AssessmentTaskCard } from "./assessment-submission/AssessmentTaskCard";

interface Props {
  application: ApplicationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutated?: () => void;
}

export function AssessmentSubmissionDialog({
  application,
  open,
  onOpenChange,
  onMutated,
}: Props) {
  const applicationId = application?.application_id ?? null;
  const assessment = useFreelancerAssessment(open ? applicationId : null, { onMutated });
  const { reload } = assessment;
  const view = assessment.view;
  const editable = view !== null && isEditableStatus(view.status);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSaveDraft = async () => {
    const result = await assessment.saveDraft();
    if (result.ok) toast.success("Draft saved.");
    else toast.error(result.error ?? "Draft could not be saved.");
  };

  const handleSubmit = async () => {
    const result = await assessment.submit();
    if (result.ok) toast.success("Assessment submitted.");
    else toast.error(result.error ?? "Assessment could not be submitted.");
  };

  const handleUpload = async (jobTaskId: number, file: File) => {
    const result = await assessment.uploadProof(jobTaskId, file);
    if (result.ok) toast.success("File uploaded.");
    else toast.error(result.error ?? "File upload could not be completed.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4 pr-14 text-left">
          <DialogTitle className="text-base font-bold text-foreground">Assessment</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {application
              ? [application.job_title, application.company_name].filter(Boolean).join(" · ")
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {assessment.loading ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : assessment.loadError !== "" ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-foreground">{assessment.loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => void assessment.reload()}
              >
                Try again
              </Button>
            </div>
          ) : view ? (
            view.tasks.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  No assessment tasks are available
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This application is not currently in an assessment stage.
                </p>
              </div>
            ) : (
              <>
                <AssessmentStatusBanner status={view.status} attempt={view.attempt} />
                {view.tasks.map((task, index) => (
                  <AssessmentTaskCard
                    key={task.job_task_id}
                    index={index}
                    task={task}
                    editable={editable}
                    value={assessment.values[task.job_task_id]}
                    issue={assessment.issues[task.job_task_id]}
                    uploading={assessment.uploadingTaskId === task.job_task_id}
                    uploadProgress={assessment.uploadProgress}
                    onChange={(value) => assessment.setFieldValue(task.job_task_id, value)}
                    onUpload={(file) => void handleUpload(task.job_task_id, file)}
                  />
                ))}
              </>
            )
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {editable && (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={assessment.savingDraft || assessment.submitting}
                onClick={() => void handleSaveDraft()}
              >
                {assessment.savingDraft ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save draft"
                )}
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={assessment.submitting || assessment.savingDraft}
                onClick={() => void handleSubmit()}
              >
                {assessment.submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit assessment"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
