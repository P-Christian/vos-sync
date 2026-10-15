"use client";

// src/modules/client/jobs/components/ConfirmCloseJobDialog.tsx

import React from "react";
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

interface Props {
  open: boolean;
  jobTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ConfirmCloseJobDialog({ open, jobTitle, onOpenChange, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close &ldquo;{jobTitle}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Candidates won&apos;t be able to apply while the job is closed. You can reopen it any time
            from the status menu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep open</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Close job
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
