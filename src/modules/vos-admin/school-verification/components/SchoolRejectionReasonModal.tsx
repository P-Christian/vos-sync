// src/modules/vos-admin/school-verification/components/SchoolRejectionReasonModal.tsx
"use client";

import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchoolVerificationRecord } from "../types";
import { AlertCircle } from "lucide-react";

interface SchoolRejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: SchoolVerificationRecord | null;
  mode: "reject" | "request_correction";
  onConfirm: (action: "reject" | "request_correction", reason: string, internalNotes: string) => Promise<void>;
  isSubmitting: boolean;
}

const SCHOOL_REASON_PRESETS = [
  "Incomplete or unreadable CHED / DepEd / TESDA Recognition or Accreditation document",
  "Expired or unverified Mayor's / Business Permit",
  "School TIN / BIR Certificate of Registration mismatch",
  "School Administrator official appointment letter or ID missing",
  "Institution profile or campus location mismatch",
  "Custom reason (see detailed notes below)",
];

export const SchoolRejectionReasonModal: React.FC<SchoolRejectionReasonModalProps> = ({
  isOpen,
  onClose,
  school,
  mode,
  onConfirm,
  isSubmitting,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");

  if (!school) return null;

  const isReject = mode === "reject";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalPublicReason =
      selectedPreset && selectedPreset !== "Custom reason (see detailed notes below)"
        ? `${selectedPreset}. ${customReason}`.trim()
        : customReason.trim();

    if (!finalPublicReason) return;

    await onConfirm(mode, finalPublicReason, internalNotes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertCircle className={`h-5 w-5 ${isReject ? "text-destructive" : "text-amber-500"}`} />
            {isReject ? "Reject School Verification" : "Request Document Correction"}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? `You are rejecting verification for ${school.school_name}. Please provide a clear explanation.`
              : `Request missing or corrected accreditation documents from ${school.school_name}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Preset Reason Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="school-preset-reason" className="text-xs font-semibold text-foreground">
              Standard Reason Preset
            </Label>
            <Select
              value={selectedPreset}
              onValueChange={(val) => setSelectedPreset(val)}
            >
              <SelectTrigger
                id="school-preset-reason"
                className="w-full text-xs h-9 rounded-lg border-border bg-background text-foreground dark:bg-zinc-900 dark:border-zinc-800"
              >
                <SelectValue placeholder="Select a standard preset reason..." />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover text-popover-foreground dark:bg-zinc-900 dark:border-zinc-800 shadow-lg">
                {SCHOOL_REASON_PRESETS.map((preset, i) => (
                  <SelectItem key={i} value={preset} className="text-xs focus:bg-accent focus:text-accent-foreground cursor-pointer">
                    {preset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Public Reason Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="school-public-reason" className="text-xs font-semibold text-foreground">
              Public Reason / Action Items <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="school-public-reason"
              placeholder="Provide clear details visible to the school administrator..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              className="text-xs rounded-lg border-border resize-none"
              required
            />
          </div>

          {/* Internal Admin Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="school-internal-notes" className="text-xs font-semibold text-foreground">
              Internal Admin Notes <span className="text-muted-foreground font-normal">(Private)</span>
            </Label>
            <Textarea
              id="school-internal-notes"
              placeholder="Notes visible only to internal VOS admin team..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              className="text-xs rounded-lg border-border resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isReject ? "destructive" : "default"}
              size="sm"
              disabled={isSubmitting || (!selectedPreset && !customReason.trim())}
              className="rounded-lg text-xs shadow-2xs font-semibold"
            >
              {isSubmitting
                ? "Submitting..."
                : isReject
                ? "Confirm Rejection"
                : "Send Correction Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
