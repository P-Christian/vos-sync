"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ReviewConfirmAction = "FAIL" | "REQUEST_REVISION";

interface ReviewConfirmDialogProps {
  pending: { attemptId: number; action: ReviewConfirmAction } | null;
  notesProvided: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ReviewConfirmDialog({
  pending,
  notesProvided,
  busy,
  onCancel,
  onConfirm,
}: ReviewConfirmDialogProps) {
  const isFail = pending?.action === "FAIL";
  return (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isFail ? "Mark attempt as failed" : "Request revision"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isFail
              ? "Are you sure you want to mark this attempt as failed? This cannot be undone."
              : "Are you sure you want to request a revision? This cannot be undone."}
            {!notesProvided &&
              " Review notes are required before confirming."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="max-md:min-h-10">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!notesProvided || busy}
            className={cn(
              "max-md:min-h-10",
              isFail &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {isFail ? "Fail attempt" : "Request revision"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
