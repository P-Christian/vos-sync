"use client";

// src/modules/client/interviews/components/CancelInterviewModal.tsx

import React, { useState } from "react";
import { Interview } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, XCircle } from "lucide-react";

interface CancelInterviewModalProps {
  interview: Interview | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirmCancel: (interviewId: number, reason: string) => Promise<boolean>;
}

const COMMON_REASONS = [
  "Schedule conflict / Recruiter unavailable",
  "Candidate requested cancellation / withdrawal",
  "Position has been filled",
  "Candidate unresponsive to confirmation",
  "Other reason",
];

export default function CancelInterviewModal({
  interview,
  open,
  saving,
  onClose,
  onConfirmCancel,
}: CancelInterviewModalProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");

  if (!interview) return null;

  const handleClose = () => {
    setError("");
    setSelectedReason(COMMON_REASONS[0]);
    setCustomReason("");
    onClose();
  };

  const handleSubmit = async () => {
    setError("");
    let finalReason = selectedReason;
    if (selectedReason === "Other reason") {
      finalReason = customReason.trim();
    } else if (customReason.trim()) {
      finalReason = `${selectedReason} - ${customReason.trim()}`;
    }

    if (!finalReason) {
      setError("Please provide a reason for cancelling this interview.");
      return;
    }

    const ok = await onConfirmCancel(interview.interview_id, finalReason);
    if (ok) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
            <XCircle className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Cancel Interview Schedule
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-500 pt-1">
            You are about to cancel the interview for{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {interview.applicant_name}
            </span>{" "}
            ({interview.job_title}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Preset Reason Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Cancellation Category
            </Label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              disabled={saving}
            >
              {COMMON_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Details / Custom Reason Textarea */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Additional Details / Reason <span className="text-zinc-400 font-normal">(Required for &apos;Other&apos;)</span>
            </Label>
            <Textarea
              placeholder="Provide specific notes regarding why this interview is being cancelled..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              className="resize-none text-xs rounded-xl"
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="h-9 text-xs rounded-xl"
          >
            Keep Interview
          </Button>

          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Confirm Cancellation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
